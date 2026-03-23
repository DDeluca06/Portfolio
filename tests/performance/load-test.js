import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
const API_URL = __ENV.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = __ENV.TEST_STATS_API_KEY || 'test-key';

// Test options
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be below 1%
    http_reqs: ['rate>100'],           // Request rate should be above 100/s
  },
};

// Request configuration
const headers = {
  'Authorization': `Bearer ${TEST_API_KEY}`,
  'Content-Type': 'application/json',
};

export default function() {
  const endpoints = [
    { url: `${API_URL}/api/health`, method: 'GET', auth: false },
    { url: `${API_URL}/api/stats`, method: 'GET', auth: true },
    { url: `${API_URL}/api/docker/containers`, method: 'GET', auth: true },
    { url: `${API_URL}/api/docker`, method: 'GET', auth: true },
    { url: `${API_URL}/api/history?measurement=cpu&range=1h`, method: 'GET', auth: true },
  ];

  // Randomly select an endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const requestHeaders = endpoint.auth ? headers : {};
  
  const response = http.get(endpoint.url, { headers: requestHeaders });

  // Check response
  check(response, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has content': (r) => r.body && r.body.length > 0,
  });

  // Random sleep between 100ms and 500ms
  sleep(Math.random() * 0.4 + 0.1);
}

// Health check endpoint load test
export function healthCheck() {
  const response = http.get(`${API_URL}/api/health`);
  
  check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
    'health returns healthy': (r) => r.json('status') === 'healthy',
  });
}

// Stats endpoint load test
export function statsEndpoint() {
  const response = http.get(`${API_URL}/api/stats`, { headers });
  
  check(response, {
    'stats status is 200': (r) => r.status === 200,
    'stats has cpu data': (r) => r.json('cpu') !== undefined,
    'stats has memory data': (r) => r.json('memory') !== undefined,
    'stats response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

// Docker containers endpoint load test
export function dockerContainers() {
  const response = http.get(`${API_URL}/api/docker/containers`, { headers });
  
  check(response, {
    'docker status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'docker response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}

// History endpoint load test
export function historyEndpoint() {
  const ranges = ['1h', '6h', '24h', '7d', '30d'];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  
  const response = http.get(
    `${API_URL}/api/history?measurement=cpu&range=${range}`,
    { headers }
  );
  
  check(response, {
    'history status is 200': (r) => r.status === 200,
    'history returns data array': (r) => Array.isArray(r.json('data')),
  });
}
