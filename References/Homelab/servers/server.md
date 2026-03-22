# Server `server` (192.168.50.115)

## Overview

`server` is the primary storage and application node in the homelab. It hosts:

- Bulk storage via Orico 5-bay USB enclosure (4x 6TB drives, 1 slot open)
- The media automation stack (Radarr/Sonarr/Lidarr/Prowlarr/Navidrome/Jellyseerr)
- The general apps stack (n8n, Copyparty, Vaultwarden, ArchiSteamFarm, Termix)
- Network support services (AdGuard Home DNS/DHCP, Gluetun + qBittorrent, Byparr)
- Portainer agent for Swarm management

Most long‑running services are deployed as Docker Swarm services (via stacks `media`, `apps`, and `portainer`), with a few stand‑alone containers.

---

## Hardware

**CPU**
- Model: Intel(R) Core(TM) i7‑7700 CPU @ 3.60GHz
- Architecture: x86_64
- Cores: 4
- Threads: 8

**Memory**
- Total: 15 GiB

**Storage layout**
- `sda` – 111.8G SSD
  - `sda1` – 1G – EFI (`/boot/efi`)
  - `sda2` – 110.7G – root filesystem (`/`)
- **Orico 5-bay USB enclosure** (5 slots, 4 populated)
  - 4x 6TB drives mounted at `/mnt/disk{1,2,3,4}`
  - MergerFS pool at `/mnt/network`
  - 1 slot available for expansion
  - Total raw capacity: ~24TB

**External / USB storage**
- Additional 1TB 3.5" drives available for dedicated use cases (backup, cold storage)
- Full drive health documentation: `../drives/drives.md`

**Notable PCI devices**
- Intel HD Graphics 630 (integrated GPU)
- Realtek RTL8111/8168/8411 Gigabit Ethernet
- Qualcomm Atheros QCA9565 Wi‑Fi adapter

---

## Storage Strategy

### Current Setup
- **Orico 5-bay USB enclosure** with 4x 6TB drives (~22TB raw)
- **MergerFS** pools `/mnt/disk{1,2,3,4}` into `/mnt/network` (unified storage pool)
- **1 open slot** in the enclosure for expansion
- Additional **1TB 3.5" drives** available for dedicated use cases

### MergerFS Configuration
- Drives: `/mnt/disk1`, `/mnt/disk2`, `/mnt/disk3`, `/mnt/disk4`
- Pool: `/mnt/network` (presented as single unified filesystem)
- This provides flexible expansion - individual drives can be addressed/removed without breaking the pool

### Available 1TB Drives Options

Given the size disparity between 1TB drives and the 6TB pool, the following options work well:

| Use Case | Drives Needed | Notes |
|----------|---------------|-------|
| **Dedicated cold backup** | 1-2 | Offline/rotated backups of critical data |
| **Docker volumes** | 1 | Fast storage for container databases (Postgres, etc.) |
| **Surveillance NVR** | 1 | If adding Frigate for camera recording |
| **RAID 1 mirror** | 2 | Direct redundancy for specific data |

### Why SnapRAID Isn't Ideal Here
- SnapRAID works best with similarly-sized drives
- A 1TB parity drive would only protect ~1TB of the 22TB pool
- **Recommendation:** Use the 1TB drives independently rather than merging them with the 6TB pool

### Future Expansion Options
- Add another 6TB drive to the Orico enclosure for more capacity
- Consider a dedicated SSD for Docker/containers (faster than spinning rust)
- Add a UPS for power protection and clean shutdowns

---

## Drive Monitoring

### SMART Health Check Script

A weekly automated SMART health check script is available at `/opt/scripts/smart-health-check.sh`.

**Features:**
- Checks all 4 drives in the Orico enclosure (/mnt/disk1-4)
- Collects key health metrics: overall status, temperature, reallocated sectors, pending sectors, uncorrectable errors
- Saves full SMART output to `/DATA/Logs/smart-health/` with date stamps
- Outputs concise summary to stdout

**Usage:**
```bash
sudo /opt/scripts/smart-health-check.sh
```

**Sample output:**
```
=========================================
SMART Health Check - 2026-03-14 10:00:00
=========================================

>>> disk1
  Status: ✅ PASSED
  Model: Toshiba MB6000GEXXV
  Power-On Hours: 54531
  Temperature: 30°C
  Reallocated Sectors: 16
  Pending Sectors: 0
  Uncorrectable Errors: 44
...
```

**Setup cron job (weekly on Sundays at 2am):**
```bash
sudo cp /path/to/homelab/scripts/smart-health-check.sh /opt/scripts/
sudo chmod +x /opt/scripts/smart-health-check.sh
sudo mkdir -p /DATA/Logs/smart-health

# Add to crontab
sudo crontab -e
# Add line:
# 0 2 * * 0 /opt/scripts/smart-health-check.sh >> /DATA/Logs/smart-health/weekly.log 2>&1
```

**Manual run:**
```bash
# Quick check
/opt/scripts/smart-health-check.sh

# View recent logs
ls -la /DATA/Logs/smart-health/
```

**Alerting:** The script returns exit code 1 if any drive has issues (pending sectors, failed health). Configure cron to email output or integrate with monitoring.

---

## Software

- OS: Ubuntu 24.04.3 LTS (`noble`)
- Kernel: 6.14.0‑37‑generic (x86_64)
- Docker Engine: 29.0.2
- Container runtime: `runc`, storage driver `overlay2`

This node participates in Docker Swarm and runs services for the `media`, `apps`, `portainer_agent`, and `traefik-public` networks.

---

## Docker & Swarm overview

### Networks (as seen from running services)

- `ingress` – Swarm ingress network for published services.
- `traefik-public` – shared overlay network for HTTP/S ingress via Traefik (Traefik itself runs on `eserver`).
- `media_media-net` – overlay network for media stack services (Radarr, Sonarr, Lidarr, Navidrome, Jellyseerr, Prowlarr, Jellyfin‑adjacent apps).
- `apps_apps-net` – overlay network for general applications (n8n, Copyparty, Vaultwarden, ArchiSteamFarm, etc.).
- `portainer_agent_network` – overlay network used by Portainer agents and server.
- `gluetun_default` – bridge network for the Gluetun VPN container and network‑namespaced qBittorrent.
- `bridge` – default local bridge network for stand‑alone containers like AdGuard and Byparr.

### High‑level stacks

- **Stack `media` (Swarm):**
  - `media_prowlarr` – indexer manager for the *Arr suite.
  - `media_sonarr` – TV series downloader/organizer.
  - `media_radarr` – movie downloader/organizer.
  - `media_lidarr` – music downloader/organizer.
  - `media_navidrome` – music streaming server.
  - `media_jellyseerr` – media request manager for Jellyfin/Plex/Emby.

- **Stack `apps` (Swarm):**
  - `apps_n8n` – workflow automation.
  - `apps_copyparty` – file upload/download & static serving.
  - `apps_vaultwarden` – Bitwarden‑compatible password manager.
  - `apps_archisteamfarm` – Steam card‑idling bot.

- **Termix (Swarm):**
  - `termix` – web‑based SSH terminal to the swarm.

- **Portainer (Swarm):**
  - `portainer_agent` – node agent used by the Portainer server on `eserver`.

- **Standalone / Compose‑style services:**
  - `gluetun` – VPN gateway container.
  - `qbittorrent` – qBittorrent client running in Gluetun’s network namespace.
  - `adguard` – AdGuard Home DNS/DHCP + HTTP UI.
  - `byparr` – antibot cookie helper service.

---

## Service details & examples

Below, each service has:

- **Purpose / function**
- **Key mounts & ports**
- **Swarm service name** (for stack usage)
- **Example Swarm/stack YAML** (using `deploy:` for Swarm)
- **Example standalone `docker-compose.yml`** (without `deploy:`)

> Note: Secrets, API keys, and admin tokens are **not** documented with real values. Use environment variables, Docker secrets, or `.env` files instead.

### Termix (web SSH)

- **Container image:** `ghcr.io/lukegus/termix:latest`
- **Swarm service:** `termix`
- **Networks:** `ingress`
- **Volumes:** `/DATA/Net/termix` → `/app/data`
- **Ports:** exposed on `ingress` (web fronted by Traefik).

**Swarm stack snippet (termix.yml):**

```yaml
tversion: "3.8"
services:
  termix:
    image: ghcr.io/lukegus/termix:latest
    volumes:
      - /DATA/Net/termix:/app/data
    environment:
      - PORT=5600
      - NODE_ENV=production
    networks:
      - ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

networks:
  ingress:
    external: true
```

**Standalone docker-compose equivalent:**

```yaml
version: "3.8"
services:
  termix:
    image: ghcr.io/lukegus/termix:latest
    restart: unless-stopped
    volumes:
      - /DATA/Net/termix:/app/data
    environment:
      - PORT=5600
      - NODE_ENV=production
    ports:
      - "5600:5600"  # or front via Traefik
```

---

### Apps stack (`apps`) – n8n, Copyparty, Vaultwarden, ArchiSteamFarm

#### n8n (workflow automation)

- **Container image:** `n8nio/n8n:latest`
- **Swarm service:** `apps_n8n`
- **Networks:** `apps_apps-net`, `traefik-public`
- **Volumes:**
  - `/DATA/Apps/n8n/.n8n` → `/home/node/.n8n`
  - `/mnt/network` → `/network`
- **Purpose:** Low‑code automation platform; executes workflows and webhooks.

#### Copyparty (file server)

- **Container image:** `copyparty/ac:latest`
- **Swarm service:** `apps_copyparty`
- **Networks:** `apps_apps-net`, `traefik-public`
- **Volumes:**
  - `/mnt/network` → `/root` (actual data)
  - `/DATA/Apps/Copyparty` → `/cfg` (configuration)
- **Purpose:** Web file drop and browser‑based file manager with thumbnailing.

#### Vaultwarden (password manager)

- **Container image:** `vaultwarden/server:latest`
- **Swarm service:** `apps_vaultwarden`
- **Networks:** `apps_apps-net`, `traefik-public`
- **Volumes:** `/DATA/Apps/vaultwarden/data` → `/data`
- **Purpose:** Self‑hosted Bitwarden‑compatible server.

#### ArchiSteamFarm (ASF)

- **Container image:** `justarchi/archisteamfarm:latest`
- **Swarm service:** `apps_archisteamfarm`
- **Networks:** `apps_apps-net`, `traefik-public`
- **Volumes:**
  - `/DATA/Apps/asf/app/config` → `/app/config`
  - `/DATA/Apps/asf/app/logs` → `/app/logs`
  - `/DATA/Apps/asf/app/plugins` → `/app/plugins`
- **Purpose:** Steam card‑idling and automation bot.

**Apps stack Swarm/stack YAML (apps.yml):**

```yaml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    volumes:
      - /DATA/Apps/n8n/.n8n:/home/node/.n8n
      - /mnt/network:/network
    environment:
      - TZ=America/New_York
      - WEBHOOK_URL=https://n8n.milisource.org
      - N8N_RESTRICT_FILE_ACCESS_TO=/network
    networks:
      - apps-net
      - traefik-public
    deploy:
      replicas: 1

  copyparty:
    image: copyparty/ac:latest
    command: ["python3", "-m", "copyparty", "-c", "/z/initcfg", "--xff-src=10.0.0.0/16", "--rproxy=1"]
    volumes:
      - /mnt/network:/root
      - /DATA/Apps/Copyparty:/cfg
    networks:
      - apps-net
      - traefik-public
    deploy:
      replicas: 1

  vaultwarden:
    image: vaultwarden/server:latest
    volumes:
      - /DATA/Apps/vaultwarden/data:/data
    environment:
      - DOMAIN=https://vault.milisource.org
      - SIGNUPS_ALLOWED=false
      - ADMIN_TOKEN=${VAULTWARDEN_ADMIN_TOKEN}
    networks:
      - apps-net
      - traefik-public
    deploy:
      replicas: 1

  archisteamfarm:
    image: justarchi/archisteamfarm:latest
    volumes:
      - /DATA/Apps/asf/app/config:/app/config
      - /DATA/Apps/asf/app/logs:/app/logs
      - /DATA/Apps/asf/app/plugins:/app/plugins
    networks:
      - apps-net
      - traefik-public
    deploy:
      replicas: 1

networks:
  apps-net:
    external: true
  traefik-public:
    external: true
```

**Standalone docker-compose equivalent (same file, without `deploy:`):**

You can use the same YAML under Compose by removing the `deploy:` sections and adding explicit `ports:` or Traefik labels to expose HTTP where needed.

---

### Media stack (`media`) – Prowlarr, Sonarr, Radarr, Lidarr, Navidrome, Jellyseerr

All `media_*` services attach to `media_media-net`, `traefik-public`, and `ingress`, and mount shared media and download directories on `/mnt/network/Torrents/...` plus individual config dirs under `/DATA/Arr` or `/DATA/Media`.

#### Prowlarr

- **Image:** `lscr.io/linuxserver/prowlarr:latest`
- **Service:** `media_prowlarr`
- **Config:** `/DATA/Arr/prowlarr` → `/config`
- **Purpose:** Indexer manager for Sonarr/Radarr/Lidarr etc.

#### Sonarr

- **Image:** `lscr.io/linuxserver/sonarr:latest`
- **Service:** `media_sonarr`
- **Config:** `/DATA/Arr/sonarr` → `/config`
- **Media:**
  - `/mnt/network/Torrents/TV Shows` → `/tv`
  - `/mnt/network/Torrents/Anime` → `/anime`
  - `/mnt/network/Torrents` → `/downloads`
- **Purpose:** Automated TV series management.

#### Radarr

- **Image:** `lscr.io/linuxserver/radarr:latest`
- **Service:** `media_radarr`
- **Config:** `/DATA/Arr/radarr` → `/config`
- **Media:**
  - `/mnt/network/Torrents/Movies` → `/movies`
  - `/mnt/network/Torrents` → `/downloads`
- **Purpose:** Automated movie management.

#### Lidarr

- **Image:** `ghcr.io/linuxserver-labs/prarr:lidarr-plugins`
- **Service:** `media_lidarr`
- **Config:** `/DATA/Arr/lidarr` → `/config`
- **Media:**
  - `/mnt/network/Torrents/Music` → `/music`
  - `/mnt/network/Torrents` → `/downloads`
- **Purpose:** Automated music management.

#### Navidrome

- **Image:** `deluan/navidrome:latest`
- **Service:** `media_navidrome`
- **Config/Data:** `/DATA/Media/Navidrome` → `/data`
- **Music:** `/mnt/network/Torrents/Music` → `/music`
- **Purpose:** Self‑hosted music streaming server.

> Note: Navidrome uses Last.fm and Spotify API credentials; configure them via environment variables or a config file, not hard‑coded in Compose.

#### Jellyseerr

- **Image:** `ghcr.io/fallenbagel/jellyseerr:latest`
- **Service:** `media_jellyseerr`
- **Config:** `/DATA/Media/Jellyserr/config` → `/app/config`
- **Purpose:** Media request management front‑end for the media stack.

**Media stack Swarm/stack YAML (media.yml):**

```yaml
version: "3.8"
services:
  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    volumes:
      - /DATA/Arr/prowlarr:/config
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    volumes:
      - /DATA/Arr/sonarr:/config
      - /mnt/network/Torrents:/downloads
      - /mnt/network/Torrents/TV Shows:/tv
      - /mnt/network/Torrents/Anime:/anime
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    volumes:
      - /DATA/Arr/radarr:/config
      - /mnt/network/Torrents:/downloads
      - /mnt/network/Torrents/Movies:/movies
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

  lidarr:
    image: ghcr.io/linuxserver-labs/prarr:lidarr-plugins
    volumes:
      - /DATA/Arr/lidarr:/config
      - /mnt/network/Torrents:/downloads
      - /mnt/network/Torrents/Music:/music
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

  navidrome:
    image: deluan/navidrome:latest
    volumes:
      - /DATA/Media/Navidrome:/data
      - /mnt/network/Torrents/Music:/music
    environment:
      - ND_DATAFOLDER=/data
      - ND_MUSICFOLDER=/music
      - ND_PORT=4533
      # ND_LASTFM_APIKEY, ND_LASTFM_SECRET, ND_SPOTIFY_ID, ND_SPOTIFY_SECRET via env/secrets
    networks:
      - media-net
      - traefik-public
    deploy:
      replicas: 1

  jellyseerr:
    image: ghcr.io/fallenbagel/jellyseerr:latest
    volumes:
      - /DATA/Media/Jellyserr/config:/app/config
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

Under plain `docker-compose`, this file is also valid if you remove the `deploy:` sections and add explicit `ports:` or Traefik labels as required.

---

### Gluetun + qBittorrent (VPN‑routed torrenting)

These run outside Swarm and are configured with a traditional Compose‑style setup.

- **Gluetun container:** `qmcgaw/gluetun:latest`
  - Network: `gluetun_default` (bridge)
  - Volumes: `/DATA/AppData/big-bear-gluetun/data` → `/gluetun`
  - Ports (host): `8090`, `8388/tcp+udp`, `8888` → VPN gateway services
  - Purpose: Provides VPN connection (Private Internet Access) and exposes HTTP(S)/SOCKS/shadowsocks services; qBittorrent shares its network namespace.

- **qBittorrent container:** `linuxserver/qbittorrent:latest`
  - Network mode: `container:gluetun` – shares IP stack with Gluetun
  - Volumes:
    - `/DATA/Net` → `/config`
    - `/mnt/network/Torrents` → `/downloads`
  - Purpose: BitTorrent client behind VPN.

**Example docker-compose.yml:**

```yaml
version: "3.8"
services:
  gluetun:
    image: qmcgaw/gluetun:latest
    container_name: gluetun
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    volumes:
      - /DATA/AppData/big-bear-gluetun/data:/gluetun
    environment:
      - VPN_SERVICE_PROVIDER=private internet access
      - VPN_TYPE=openvpn
      - OPENVPN_USER=${PIA_USER}
      - OPENVPN_PASSWORD=${PIA_PASSWORD}
      - FIREWALL_OUTBOUND_SUBNETS=192.168.0.0/16,100.64.0.0/10,172.16.0.0/12
      - PUID=1000
      - PGID=1000
    ports:
      - "8090:8090"    # qBittorrent Web UI via reverse proxy
      - "8388:8388/tcp"
      - "8388:8388/udp"
      - "8888:8888/tcp"  # HTTP proxy
    restart: unless-stopped

  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    network_mode: "container:gluetun"
    volumes:
      - /DATA/Net:/config
      - /mnt/network/Torrents:/downloads
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - WEBUI_PORT=8090
    depends_on:
      - gluetun
    restart: unless-stopped
```

---

### AdGuard Home (DNS/DHCP)

- **Image:** `adguard/adguardhome:latest`
- **Container name:** `adguard`
- **Network:** `bridge`
- **Volumes:**
  - `/DATA/adguard/conf` → `/opt/adguard/conf`
  - `/DATA/adguard/work` → `/opt/adguard/work`
- **Ports (host):**
  - DNS: `53/udp`
  - DHCP: `67/udp`
  - HTTPS DNS / DoT: `443/udp`, `853/tcp+udp`
  - HTTP UI: `8031:80/tcp`
  - Admin UI: `3020:3000/tcp`
- **Purpose:** Network‑wide ad/tracker blocking DNS resolver with optional DHCP.

**Example docker-compose:**

```yaml
version: "3.8"
services:
  adguard:
    image: adguard/adguardhome:latest
    container_name: adguard
    restart: unless-stopped
    volumes:
      - /DATA/adguard/conf:/opt/adguard/conf
      - /DATA/adguard/work:/opt/adguard/work
    ports:
      - "53:53/udp"
      - "67:67/udp"
      - "443:443/udp"
      - "853:853/tcp"
      - "853:853/udp"
      - "8031:80/tcp"
      - "3020:3000/tcp"
```

---

### Byparr (antibot helper)

- **Image:** `ghcr.io/thephaseless/byparr:latest`
- **Container name:** `byparr`
- **Network:** `bridge`
- **Ports:** `8191/tcp` (HTTP API)
- **Purpose:** Provides antibot cookies/user‑agent handling for upstream scrapers.

**Example docker-compose:**

```yaml
version: "3.8"
services:
  byparr:
    image: ghcr.io/thephaseless/byparr:latest
    container_name: byparr
    restart: unless-stopped
    ports:
      - "8191:8191"
```

---

### Portainer agent (Swarm)

- **Image:** `portainer/agent:2.27.6`
- **Service:** `portainer_agent`
- **Volumes:**
  - `/var/run/docker.sock` → `/var/run/docker.sock`
  - `/var/lib/docker/volumes` → `/var/lib/docker/volumes`
  - `/` → `/host`
- **Networks:** `ingress`, `portainer_agent_network`
- **Purpose:** Node agent which the Portainer server uses to inspect/kubernetes this node.

In Swarm, the agent is typically deployed by Portainer itself; a minimal service spec:

```yaml
version: "3.8"
services:
  portainer_agent:
    image: portainer/agent:2.27.6
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
      - /:/host
    networks:
      - portainer_agent_network
    deploy:
      mode: global

networks:
  portainer_agent_network:
    external: true
```

---

### Other containers and legacy services

`docker ps -a` on `server` also shows several exited containers from earlier iterations of this stack (older `sonarr`, `radarr`, `prowlarr`, `navidrome`, `vaultwarden`, `nginxproxymanager`, `crafty`, etc.). These represent previous configurations and are not currently active.

For documentation purposes, the **active elements of the homelab on `server`** are the services and stacks described above.
