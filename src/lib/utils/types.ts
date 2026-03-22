export interface ResumeData {
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  profiles: Profile[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  skills: {
    development: Skill[];
    infrastructure: Skill[];
    ai: Skill[];
  };
}

export interface Profile {
  network: string;
  username: string;
  url: string;
  icon: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  period: string;
  description: string[];
  highlights: string[];
}

export interface Education {
  school: string;
  location: string;
  period: string;
  description: string;
}

export interface Certification {
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface Skill {
  name: string;
  level: number;
  category: string;
}

export interface HomelabData {
  overview: {
    totalServices: number;
    totalStorage: string;
    effectiveStorage: string;
    uptime: string;
    servers: number;
    networks: number;
  };
  servers: Server[];
  networks: Network[];
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  role: string;
  hardware: {
    cpu: string;
    cores: number;
    threads: number;
    memory: string;
    storage: StorageDevice[];
  };
  software: {
    os: string;
    kernel: string;
    docker: string;
    storageStrategy: string;
  };
  stacks: Stack[];
}

export interface StorageDevice {
  device: string;
  size: string;
  type: string;
  mount: string;
}

export interface Stack {
  name: string;
  services: Service[];
}

export interface Service {
  name: string;
  description: string;
  icon: string;
}

export interface Network {
  name: string;
  type: string;
  purpose: string;
}

export interface TerminalCommand {
  command: string;
  description: string;
  output: string;
}
