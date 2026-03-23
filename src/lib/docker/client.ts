/**
 * Docker API Client
 *
 * Minimal client initialization for Docker Socket Proxy connection
 */
import Docker from "dockerode";

const DOCKER_HOST = process.env.DOCKER_HOST || "tcp://docker-proxy:2375";
const DOCKER_PORT = 2375;

function getDockerConfig(): { host: string; port: number } {
  if (DOCKER_HOST.startsWith("tcp://")) {
    const url = new URL(DOCKER_HOST);
    return {
      host: url.hostname,
      port: parseInt(url.port) || DOCKER_PORT,
    };
  }
  return { host: "docker-proxy", port: DOCKER_PORT };
}

const config = getDockerConfig();

export const docker = new Docker({
  host: config.host,
  port: config.port,
  protocol: "http", // Internal network, proxy handles security
});
