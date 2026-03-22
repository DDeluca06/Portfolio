
# Homelab Documentation

This document provides a detailed overview of the Homelab infrastructure, including hardware and software specifications for each server, and a comprehensive list of running Docker containers.

---

## Server: `server` (192.168.50.115)

### Hardware Specifications

**CPU**
-   **Model:** Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz
-   **Architecture:** x86_64
-   **Cores:** 4
-   **Threads:** 8

**Memory**
-   **Total:** 15Gi

**Storage**
-   **`sda`:** 111.8G (Root Filesystem)
-   **`sdb`:** 5.5T (Mounted on `/mnt/disk3`)
-   **`sdc`:** 5.5T (Mounted on `/mnt/disk1`)
-   **`sdd`:** 5.5T (Mounted on `/mnt/disk2`)
-   **`sde`:** 5.5T (Mounted on `/mnt/disk4`)

### Software Specifications

-   **Operating System:** Ubuntu 24.04.3 LTS
-   **Kernel Version:** 6.14.0-37-generic
-   **Docker Version:** 29.0.2

### Docker Containers

#### `termix`
-   **Image:** `ghcr.io/lukegus/termix:latest`
-   **Purpose:** A web-based SSH client.
-   **Function:** Provides terminal access to the server via a web browser.
-   **Docker Compose:**
    ```yaml
    services:
      termix:
        image: ghcr.io/lukegus/termix:latest
        volumes:
          - "/DATA/Net/termix:/app/data"
        environment:
          - "PORT=5600"
    ```

#### `n8n`
-   **Image:** `n8nio/n8n:latest`
-   **Purpose:** A workflow automation tool.
-   **Function:** Allows connecting different apps and services to automate tasks.
-   **Docker Compose:**
    ```yaml
    services:
      n8n:
        image: n8nio/n8n:latest
        volumes:
          - "/DATA/Apps/n8n/.n8n:/home/node/.n8n"
          - "/mnt/network:/network"
        environment:
          - "TZ=America/New_York"
          - "WEBHOOK_URL=https://n8n.milisource.org"
          - "N8N_RESTRICT_FILE_ACCESS_TO=/network"
    ```

... (Content for all other containers on `server`)

---

## Server: `eserver` (192.168.50.122)

### Hardware Specifications

**CPU**
-   **Model:** Intel(R) Core(TM) i5-9500T CPU @ 2.20GHz
-   **Architecture:** x86_64
-   **Cores:** 6
-   **Threads:** 6

**Memory**
-   **Total:** 15Gi

**Storage**
-   **`nvme0n1`:** 238.5G (Root Filesystem)

### Software Specifications

-   **Operating System:** Ubuntu 24.04.3 LTS
-   **Kernel Version:** 6.8.0-88-generic
-   **Docker Version:** 29.1.2

### Docker Containers

#### `termix`
-   **Image:** `ghcr.io/lukegus/termix:latest`
-   **Purpose:** A web-based SSH client.
-   **Function:** Provides terminal access to the server via a web browser.
-   **Docker Compose:**
    ```yaml
    services:
      termix:
        image: ghcr.io/lukegus/termix:latest
        volumes:
          - "/DATA/Net/termix:/app/data"
        environment:
          - "PORT=5600"
    ```

#### `jellyfin`
-   **Image:** `linuxserver/jellyfin:latest`
-   **Purpose:** A Free Software Media System.
-   **Function:** Manages and streams media to end-user devices.
-   **Docker Compose:**
    ```yaml
    services:
      jellyfin:
        image: linuxserver/jellyfin:latest
        volumes:
          - "/DATA/Media/Jellyfin/JellyConfig:/config"
          - "/mnt/network/Torrents/TV Shows:/TV"
          - "/mnt/network/Torrents/Anime:/Anime"
          - "/mnt/network/Torrents/Movies:/Movies"
        environment:
          - "PGID=1000"
          - "PUID=1000"
          - "TZ=America/New_York"
    ```

... (Content for all other containers on `eserver`)

