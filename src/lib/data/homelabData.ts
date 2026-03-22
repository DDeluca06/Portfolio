import type { HomelabData } from '$lib/utils/types';

export const homelabData: HomelabData = {
  overview: {
    totalServices: 25,
    totalStorage: "24TB",
    effectiveStorage: "22TB",
    uptime: "99.9%",
    servers: 2,
    networks: 6
  },
  servers: [
    {
      id: "server",
      name: "server",
      ip: "192.168.50.115",
      role: "Storage & Applications",
      hardware: {
        cpu: "Intel Core i7-7700 @ 3.60GHz",
        cores: 4,
        threads: 8,
        memory: "15GB",
        storage: [
          { device: "sda", size: "111.8GB", type: "SSD", mount: "Root" },
          { device: "disk1", size: "6TB", type: "HDD", mount: "/mnt/disk1" },
          { device: "disk2", size: "6TB", type: "HDD", mount: "/mnt/disk2" },
          { device: "disk3", size: "6TB", type: "HDD", mount: "/mnt/disk3" },
          { device: "disk4", size: "6TB", type: "HDD", mount: "/mnt/disk4" }
        ]
      },
      software: {
        os: "Ubuntu 24.04.3 LTS",
        kernel: "6.14.0-37-generic",
        docker: "29.0.2",
        storageStrategy: "MergerFS Pool"
      },
      stacks: [
        {
          name: "Media Stack",
          services: [
            { name: "Jellyfin", description: "Media streaming server", icon: "play" },
            { name: "Radarr", description: "Movie management", icon: "film" },
            { name: "Sonarr", description: "TV series management", icon: "tv" },
            { name: "Lidarr", description: "Music management", icon: "music" },
            { name: "Prowlarr", description: "Indexer manager", icon: "search" },
            { name: "Navidrome", description: "Music streaming", icon: "audio-lines" },
            { name: "Jellyseerr", description: "Media requests", icon: "message-square" },
            { name: "Bazarr", description: "Subtitle manager", icon: "subtitles" },
            { name: "Komga", description: "Comics server", icon: "book-open" },
            { name: "Mylar3", description: "Comic downloader", icon: "download" },
            { name: "Cleanuparr", description: "Library cleanup", icon: "trash-2" }
          ]
        },
        {
          name: "Apps Stack",
          services: [
            { name: "n8n", description: "Workflow automation", icon: "workflow" },
            { name: "Vaultwarden", description: "Password manager", icon: "lock" },
            { name: "Copyparty", description: "File server", icon: "files" },
            { name: "ArchiSteamFarm", description: "Steam automation", icon: "gamepad-2" }
          ]
        },
        {
          name: "Infrastructure",
          services: [
            { name: "Traefik", description: "Reverse proxy", icon: "arrow-left-right" },
            { name: "Portainer", description: "Container management", icon: "containers" },
            { name: "AdGuard Home", description: "DNS/DHCP", icon: "shield" },
            { name: "Gluetun", description: "VPN gateway", icon: "globe" },
            { name: "qBittorrent", description: "BitTorrent client", icon: "download-cloud" },
            { name: "Termix", description: "Web SSH", icon: "terminal" },
            { name: "Byparr", description: "Antibot helper", icon: "bot" }
          ]
        }
      ]
    },
    {
      id: "eserver",
      name: "eserver",
      ip: "192.168.50.122",
      role: "Edge & Ingress",
      hardware: {
        cpu: "Intel Core i5-9500T @ 2.20GHz",
        cores: 6,
        threads: 6,
        memory: "15GB",
        storage: [
          { device: "nvme0n1", size: "238.5GB", type: "NVMe SSD", mount: "Root" }
        ]
      },
      software: {
        os: "Ubuntu 24.04.3 LTS",
        kernel: "6.8.0-88-generic",
        docker: "29.1.2",
        storageStrategy: "Standard"
      },
      stacks: [
        {
          name: "Edge Services",
          services: [
            { name: "Traefik", description: "Primary reverse proxy", icon: "arrow-left-right" },
            { name: "Portainer Server", description: "Swarm management UI", icon: "layout-dashboard" },
            { name: "AdGuard Home", description: "DNS/DHCP secondary", icon: "shield" }
          ]
        },
        {
          name: "Media Serving",
          services: [
            { name: "Jellyfin", description: "Primary media server", icon: "play" },
            { name: "slskd", description: "Soulseek client", icon: "music-2" }
          ]
        }
      ]
    }
  ],
  networks: [
    { name: "traefik-public", type: "Overlay", purpose: "HTTP/S ingress" },
    { name: "media_media-net", type: "Overlay", purpose: "Media services" },
    { name: "apps_apps-net", type: "Overlay", purpose: "Application services" },
    { name: "ingress", type: "Swarm", purpose: "Swarm routing" },
    { name: "portainer_agent", type: "Overlay", purpose: "Management" },
    { name: "gluetun_default", type: "Bridge", purpose: "VPN isolation" }
  ]
};
