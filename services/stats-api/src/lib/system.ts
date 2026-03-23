/**
 * System Stats Collection Library
 * 
 * Collects system metrics using systeminformation library
 */

import si from "systeminformation";

export interface CPUStats {
  usage: number;
  loadAverage: number[];
  cores: number;
  temperature?: number;
}

export interface MemoryStats {
  total: number;
  used: number;
  free: number;
  cached: number;
  percentage: number;
}

export interface DiskStats {
  fs: string;
  type: string;
  size: number;
  used: number;
  available: number;
  percentage: number;
  mount: string;
}

export interface NetworkStats {
  interface: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
}

export interface SystemStats {
  timestamp: string;
  uptime: number;
  cpu: CPUStats;
  memory: MemoryStats;
  disks: DiskStats[];
  network: NetworkStats[];
  os: {
    platform: string;
    distro: string;
    release: string;
    hostname: string;
  };
  processes: {
    total: number;
    running: number;
    blocked: number;
  };
}

/**
 * Collect current system statistics
 */
export async function collectSystemStats(): Promise<SystemStats> {
  const [
    cpuLoad,
    memInfo,
    fsInfo,
    netInfo,
    osInfo,
    processInfo,
    cpuTemp
  ] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.osInfo(),
    si.processes(),
    si.cpuTemperature().catch(() => ({ main: null, cores: [], max: null }))
  ]);

  return {
    timestamp: new Date().toISOString(),
    uptime: si.time().uptime,
    cpu: {
      usage: Math.round(cpuLoad.currentLoad * 100) / 100,
      loadAverage: cpuLoad.avgLoad ? [cpuLoad.avgLoad] : cpuLoad.rawCurrentLoad ? [cpuLoad.rawCurrentLoad] : [0, 0, 0],
      cores: cpuLoad.cpus.length,
      temperature: cpuTemp.main || undefined
    },
    memory: {
      total: memInfo.total,
      used: memInfo.used,
      free: memInfo.free,
      cached: memInfo.cached || 0,
      percentage: Math.round((memInfo.used / memInfo.total) * 100 * 100) / 100
    },
    disks: fsInfo.map(fs => ({
      fs: fs.fs,
      type: fs.type,
      size: fs.size,
      used: fs.used,
      available: fs.available,
      percentage: Math.round(fs.use * 100) / 100,
      mount: fs.mount
    })),
    network: netInfo.map(net => ({
      interface: net.iface,
      rxBytes: net.rx_bytes,
      txBytes: net.tx_bytes,
      rxPackets: net.rx_dropped || 0,
      txPackets: net.tx_dropped || 0,
      rxErrors: net.rx_errors || 0,
      txErrors: net.tx_errors || 0
    })),
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      hostname: osInfo.hostname
    },
    processes: {
      total: processInfo.all,
      running: processInfo.running,
      blocked: processInfo.blocked
    }
  };
}

/**
 * Collect lightweight stats for quick health checks
 */
export async function collectQuickStats(): Promise<Pick<SystemStats, "timestamp" | "cpu" | "memory">> {
  const [cpuLoad, memInfo] = await Promise.all([
    si.currentLoad(),
    si.mem()
  ]);

  return {
    timestamp: new Date().toISOString(),
    cpu: {
      usage: Math.round(cpuLoad.currentLoad * 100) / 100,
      loadAverage: cpuLoad.avgLoad ? [cpuLoad.avgLoad] : [0, 0, 0],
      cores: cpuLoad.cpus.length
    },
    memory: {
      total: memInfo.total,
      used: memInfo.used,
      free: memInfo.free,
      cached: memInfo.cached || 0,
      percentage: Math.round((memInfo.used / memInfo.total) * 100 * 100) / 100
    }
  };
}

/**
 * Get system information (static info that doesn't change often)
 */
export async function getSystemInfo() {
  const [osInfo, cpuInfo, memInfo, diskLayout] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.memLayout(),
    si.diskLayout()
  ]);

  return {
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      codename: osInfo.codename,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      hostname: osInfo.hostname,
      fqdn: osInfo.fqdn
    },
    cpu: {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      vendor: cpuInfo.vendor,
      family: cpuInfo.family,
      model: cpuInfo.model,
      stepping: cpuInfo.stepping,
      revision: cpuInfo.revision,
      voltage: cpuInfo.voltage,
      speed: cpuInfo.speed,
      speedMin: cpuInfo.speedMin,
      speedMax: cpuInfo.speedMax,
      governor: cpuInfo.governor,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      efficiencyCores: cpuInfo.efficiencyCores,
      performanceCores: cpuInfo.performanceCores,
      processors: cpuInfo.processors
    },
    memory: {
      totalRam: memInfo.reduce((acc, mem) => acc + mem.size, 0),
      slots: memInfo.length,
      layouts: memInfo.map(m => ({
        size: m.size,
        bank: m.bank,
        type: m.type,
        ecc: m.ecc,
        clockSpeed: m.clockSpeed,
        formFactor: m.formFactor,
        manufacturer: m.manufacturer,
        partNum: m.partNum,
        serialNum: m.serialNum,
        voltageConfigured: m.voltageConfigured,
        voltageMin: m.voltageMin,
        voltageMax: m.voltageMax
      }))
    },
    disks: diskLayout.map(d => ({
      device: d.device,
      type: d.type,
      name: d.name,
      vendor: d.vendor,
      size: d.size,
      bytesPerSector: d.bytesPerSector,
      totalCylinders: d.totalCylinders,
      totalHeads: d.totalHeads,
      totalSectors: d.totalSectors,
      totalTracks: d.totalTracks,
      tracksPerCylinder: d.tracksPerCylinder,
      sectorsPerTrack: d.sectorsPerTrack,
      firmwareRevision: d.firmwareRevision,
      serialNum: d.serialNum,
      interfaceType: d.interfaceType,
      smartStatus: d.smartStatus,
      temperature: d.temperature
    }))
  };
}

export default {
  collectSystemStats,
  collectQuickStats,
  getSystemInfo
};
