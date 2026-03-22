# Server `eserver` (192.168.50.122)

## Overview

`eserver` is the edge / ingress node in the homelab. It handles:

- HTTP/S ingress for Swarm services via Traefik
- Media serving (Jellyfin)
- Reading/media apps (Komga, Mylar3, Bazarr, Cleanuparr)
- Soulseek client (`slskd`)
- AdGuard Home for DNS/DHCP
- Portainer CE UI and Portainer agent for Swarm management
- Jellyseerr instance for requests

Most media‑related services on this node are Swarm services (`media` stack), while others (AdGuard, Jellyseerr, Portainer server, slskd) run as classic containers.

---

## Hardware

**CPU**
- Model: Intel(R) Core(TM) i5‑9500T CPU @ 2.20GHz
- Architecture: x86_64
- Cores: 6
- Threads: 6

**Memory**
- Total: 15 GiB

**Storage**
- `nvme0n1` – 238.5G NVMe SSD
  - `nvme0n1p1` – 1G – EFI (`/boot/efi`)
  - `nvme0n1p2` – 2G – `/boot`
  - `nvme0n1p3` – 235.4G – LVM PV → `ubuntu-vg/ubuntu-lv` mounted at `/`

**Notable NIC/GPU**
- Intel UHD Graphics 630 (integrated)
- Intel Ethernet Connection (7) I219‑LM (onboard NIC)

---

## Software

- OS: Ubuntu 24.04.3 LTS (`noble`)
- Kernel: 6.8.0‑88‑generic (x86_64)
- Docker Engine: 29.1.2
- Storage driver: `overlay2`

`eserver` is part of the Docker Swarm cluster and hosts:

- Traefik v3 as the primary reverse proxy
- The `media` and `apps` stacks’ frontends (via `traefik-public` network)
- Portainer server (managing the cluster)

---

## Docker & Swarm overview

### Key networks

- `traefik-public` – overlay network for TLS‑terminated HTTP/S traffic.
- `media_media-net` – overlay network for media services.
- `vpn` – overlay network connecting Traefik to VPN‑routed backends if needed.
- `ingress` – Swarm ingress network.
- `portainer_agent_network` – overlay network for the Portainer agent.
- `bridge` – default local bridge for stand‑alone containers (AdGuard, Jellyseerr, Portainer server, slskd).

### High‑level stacks & services

- **Swarm services:**
  - `termix` – Termix instance on this node.
  - `traefik` – Traefik v3 reverse proxy.
  - `media_jellyfin` – Jellyfin media server.
  - `media_komga` – Komga comics/books server.
  - `media_mylar` – Mylar3 comic downloader.
  - `media_bazarr` – Bazarr subtitle manager.
  - `media_cleanuparr` – Cleanuparr cleanup automation.
  - `portainer_agent` – Portainer node agent.

- **Standalone containers:**
  - `adguard` – AdGuard Home (DNS/DHCP).
  - `slskd` – Soulseek client (`slskd/slskd`).
  - `jellyserr` – Jellyseerr instance (non‑swarm, separate from media stack).
  - `portainer` – Portainer CE server/UI.

---

## Service details & examples

As with `server`, we provide Swarm/stack YAML snippets and equivalent `docker-compose` style definitions. Secrets (passwords, API keys, etc.) are not documented with real values.

### Traefik (cluster ingress)

- **Image:** `traefik:latest`
- **Service:** `traefik`
- **Networks:** `ingress`, `traefik-public`, `vpn`
- **Volumes:**
  - `/var/run/docker.sock` → `/var/run/docker.sock`
  - `/etc/traefik/dynamic` → `/etc/traefik/dynamic` (read‑only dynamic config)
  - Swarm volume `traefik_letsencrypt` → `/letsencrypt` (ACME storage)
- **Purpose:** Reverse proxy and certificate manager for all HTTP/S services, discovering Swarm and Docker services via labels.

**Swarm stack snippet (traefik.yml):**

```yaml
version: "3.8"
services:
  traefik:
    image: traefik:latest
    command:
      - --providers.swarm=true
      - --providers.docker=true
      - --providers.swarm.network=traefik-public
      - --providers.docker.exposedByDefault=false
      - --providers.docker.endpoint=unix:///var/run/docker.sock
      - --providers.swarm.exposedByDefault=false
      - --providers.swarm.endpoint=unix:///var/run/docker.sock
      - --providers.file.directory=/etc/traefik/dynamic
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.dashboard.address=:8080
      - --api.dashboard=true
      - --api.insecure=false
      - --certificatesresolvers.le.acme.dnsChallenge.provider=cloudflare
      - --certificatesresolvers.le.acme.email=you@example.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --log.level=DEBUG
      - --accesslog=true
      - --entrypoints.web.http.redirections.entryPoint.to=websecure
      - --entrypoints.web.http.redirections.entryPoint.scheme=https
    environment:
      - CF_DNS_API_TOKEN_FILE=/run/secrets/CLOUDFLARE_DNS_API_KEY
    secrets:
      - CLOUDFLARE_DNS_API_KEY
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /etc/traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - traefik-public
      - vpn
      - ingress
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname == milkymiracle

secrets:
  CLOUDFLARE_DNS_API_KEY:
    external: true

networks:
  traefik-public:
    external: true
  vpn:
    external: true
  ingress:
    external: true

volumes:
  traefik_letsencrypt:
    external: true
```

Under plain Compose, remove `deploy:` and Swarm‑specific parts; this service would usually still rely on Docker labels to route to backends.

---

### Jellyfin (media server)

- **Image:** `linuxserver/jellyfin:latest`
- **Service:** `media_jellyfin`
- **Networks:** `media_media-net`, `traefik-public`
- **Volumes:**
  - `/DATA/Media/Jellyfin/JellyConfig` → `/config`
  - `/mnt/network/Torrents/TV Shows` → `/TV`
  - `/mnt/network/Torrents/Anime` → `/Anime`
  - `/mnt/network/Torrents/Movies` → `/Movies`
- **Purpose:** Main media library server (movies, TV, anime).

**Stack/Compose snippet:**

```yaml
version: "3.8"
services:
  jellyfin:
    image: linuxserver/jellyfin:latest
    volumes:
      - /DATA/Media/Jellyfin/JellyConfig:/config
      - /mnt/network/Torrents/TV Shows:/TV
      - /mnt/network/Torrents/Anime:/Anime
      - /mnt/network/Torrents/Movies:/Movies
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

networks:
  media-net:
    external: true
  traefik-public:
    external: true
```

For plain `docker-compose`, remove `deploy:`; expose port 8096/8920 or use Traefik labels.

---

### Komga (comics/books), Mylar3, Bazarr, Cleanuparr – `media` stack

#### Komga

- **Image:** `gotson/komga:latest`
- **Service:** `media_komga`
- **Config/data:**
  - `/DATA/Media/Komga/config` → `/config`
  - `/DATA/Media/Komga/data` → `/data`
- **Libraries:**
  - `/mnt/network/Torrents/Books/Manga` → `/manga`
  - `/mnt/network/Torrents/Books/Books` → `/books`
  - `/mnt/network/Torrents/Books/Comics` → `/comics`
  - `/mnt/network/Torrents/Books/Artbooks` → `/artbooks`
- **Purpose:** Comics/manga/book server.

#### Mylar3

- **Image:** `lscr.io/linuxserver/mylar3:latest`
- **Service:** `media_mylar`
- **Config:** `/DATA/Media/Mylar/config` → `/config`
- **Media:** `/mnt/network/Torrents/Books/Comics` → `/comics`
- **Downloads:** `/mnt/network/Torrents/Seeding Hell` → `/downloads`
- **Purpose:** Automated comic downloader and manager.

#### Bazarr

- **Image:** `lscr.io/linuxserver/bazarr:latest`
- **Service:** `media_bazarr`
- **Config:** `/DATA/Arr/bazarr` → `/config`
- **Media/Downloads:**
  - `/mnt/network/Torrents/Movies` → `/movies`
  - `/mnt/network/Torrents/Anime` → `/anime`
  - `/mnt/network/Torrents` → `/downloads`
- **Purpose:** Subtitle manager for Sonarr/Radarr libraries.

#### Cleanuparr

- **Image:** `ghcr.io/cleanuparr/cleanuparr:latest`
- **Service:** `media_cleanuparr`
- **Config:** `/DATA/Arr/cleanuparr` → `/config`
- **Purpose:** Cleans up downloads and library items based on the *Arr stack state.

**Media stack example (partial) YAML:**

```yaml
version: "3.8"
services:i've seen people play it a fuck ton and it's like, one of the few MMOs that JoshStrifeHays actually gives overall positive praise to without finding something to complain about
11:55 PM

  komga:
    image: gotson/komga:latest
    volumes:
      - /DATA/Media/Komga/config:/config
      - /DATA/Media/Komga/data:/data
      - /mnt/network/Torrents/Books/Manga:/manga
      - /mnt/network/Torrents/Books/Books:/books
      - /mnt/network/Torrents/Books/Comics:/comics
      - /mnt/network/Torrents/Books/Artbooks:/artbooks
    environment:
      - TZ=America/New_York
    networks:
      - media-net
      - traefik-public

  mylar3:
    image: lscr.io/linuxserver/mylar3:latest
    volumes:
      - /DATA/Media/Mylar/config:/config
      - /mnt/network/Torrents/Books/Comics:/comics
      - "/mnt/network/Torrents/Seeding Hell:/downloads"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    networks:
      - media-net
      - traefik-public

  bazarr:
    image: lscr.io/linuxserver/bazarr:latest
    volumes:
      - /DATA/Arr/bazarr:/config
      - /mnt/network/Torrents:/downloads
      - /mnt/network/Torrents/Movies:/movies
      - /mnt/network/Torrents/Anime:/anime
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    networks:
      - media-net
      - traefik-public

  cleanuparr:
    image: ghcr.io/cleanuparr/cleanuparr:latest
    volumes:
      - /DATA/Arr/cleanuparr:/config
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    networks:
      - media-net
      - traefik-public

networks:
  media-net:
    external: true
  traefik-public:
    external: true
```

Again, `deploy:` sections can be added for Swarm or omitted for Compose.

---

### AdGuard Home (DNS/DHCP on eserver)

This instance mirrors the role of the AdGuard container on `server`, but with its config under `/DATA/Net/adguard`.

- **Image:** `adguard/adguardhome:latest`
- **Container:** `adguard`
- **Volumes:**
  - `/DATA/Net/adguard/conf` → `/opt/adguard/conf`
  - `/DATA/Net/adguard/work` → `/opt/adguard/work`
- **Ports:** same mappings as on `server` (53/udp, 67/udp, 443/udp, 853/tcp+udp, 8031:80, 3020:3000).

Compose for this container is essentially identical to the one in `server.md` with updated paths.

---

### slskd (Soulseek client)

- **Image:** `slskd/slskd:latest`
- **Container:** `slskd`
- **Network:** `bridge`
- **Volumes:**
  - `/DATA/Media/slskd` → `/app`
  - `/mnt/network/Torrents/Soulseek Hell` → `/downloads`
  - `/mnt/network/Torrents/Music` → `/music`
- **Ports:**
  - `5030/tcp` – HTTP UI
  - `5031/tcp` – HTTPS UI (if enabled)
  - `50300/tcp` – Soulseek peer port
- **Purpose:** Persistent Soulseek client integrated into the media stack.

**Example docker-compose:**

```yaml
version: "3.8"
services:
  slskd:
    image: slskd/slskd:latest
    container_name: slskd
    user: "1000:1000"
    volumes:
      - /DATA/Media/slskd:/app
      - "/mnt/network/Torrents/Soulseek Hell:/downloads"
      - /mnt/network/Torrents/Music:/music
    environment:
      - SLSKD_SLSK_USERNAME=YOUR_USERNAME
      - SLSKD_SLSK_PASSWORD=${SLSKD_SLSK_PASSWORD}
      - SLSKD_SHARED_DIR=/music
      - SLSKD_DOWNLOADS_DIR=/downloads
    ports:
      - "5030:5030"
      - "5031:5031"
      - "50300:50300"
    restart: unless-stopped
```

---

### Jellyseerr (standalone)

- **Image:** `ghcr.io/fallenbagel/jellyseerr:latest`
- **Container:** `jellyserr`
- **Network:** `bridge`
- **Config:** `/DATA/serr` → `/app/config`
- **Ports:** `5055:5055/tcp`
- **Purpose:** Request management UI for media, separate from the Swarm `media_jellyseerr` instance.

**Compose snippet:**

```yaml
version: "3.8"
services:
  jellyseerr:
    image: ghcr.io/fallenbagel/jellyseerr:latest
    container_name: jellyserr
    restart: unless-stopped
    volumes:
      - /DATA/serr:/app/config
    ports:
      - "5055:5055"
```

---

### Portainer CE server & agent

- **Agent:** `portainer_agent` Swarm service (same pattern as on `server`).
- **Server image:** `portainer/portainer-ce:lts`
- **Container:** `portainer`
- **Volumes:**
  - Named volume `portainer_data` → `/data`
  - `/var/run/docker.sock` → `/var/run/docker.sock`
- **Ports:**
  - `8000:8000` – Edge agent tunnel
  - `9443:9443` – HTTPS UI (primary)
- **Purpose:** Management UI for the Swarm, agents, and local Docker.

**Compose snippet:**

```yaml
version: "3.8"
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    volumes:
      - portainer_data:/data
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - "8000:8000"
      - "9443:9443"

volumes:
  portainer_data:
```

Portainer itself can be used to deploy the Swarm `portainer_agent` service (see the `server.md` example).

---

### Other containers / legacy services

`docker ps -a` on `eserver` shows several historical containers (e.g. older Jellyfin, FoundryVTT, Homepage, pihole, custom apps). These are currently stopped and not part of the active homelab footprint.

The **active elements on `eserver`** are the services described above: Traefik, Jellyfin, Komga, Mylar3, Bazarr, Cleanuparr, slskd, AdGuard Home, Jellyseerr, Portainer server, and the Portainer agent.
