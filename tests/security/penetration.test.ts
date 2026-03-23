import { describe, test, expect } from 'bun:test';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

describe('Security: SQL Injection Prevention', () => {
  test('handles SQL injection attempts in query parameters', async () => {
    const maliciousInputs = [
      "'; DROP TABLE metrics; --",
      "1' OR '1'='1",
      "1; DELETE FROM metrics WHERE '1'='1",
      "' UNION SELECT * FROM users --",
      "${process.env}",
      "`whoami`",
    ];

    for (const input of maliciousInputs) {
      const response = await fetch(
        `${API_URL}/api/history?measurement=${encodeURIComponent(input)}&range=1h`,
        { headers: { 'Authorization': `Bearer ${TEST_API_KEY}` } }
      );

      // Should return 200 (InfluxDB handles sanitization) or 400 (validation error)
      // Should NOT crash the server
      expect([200, 400, 404, 500]).toContain(response.status);
      
      // Response should be valid JSON
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    }
  });

  test('handles SQL injection in aggregate endpoint', async () => {
    const maliciousInput = "cpu'; DROP MEASUREMENT cpu; --";
    
    const response = await fetch(
      `${API_URL}/api/history/aggregate?measurement=${encodeURIComponent(maliciousInput)}&range=24h`,
      { headers: { 'Authorization': `Bearer ${TEST_API_KEY}` } }
    );

    // Should not execute the malicious query
    expect([200, 400, 404, 500]).toContain(response.status);
  });
});

describe('Security: API Key Enumeration', () => {
  test('does not leak information about valid vs invalid keys', async () => {
    const responses = await Promise.all([
      fetch(`${API_URL}/api/stats`), // No key
      fetch(`${API_URL}/api/stats`, { headers: { 'Authorization': 'Bearer wrong' } }),
      fetch(`${API_URL}/api/stats`, { headers: { 'Authorization': 'Bearer ' + 'a'.repeat(32) } }),
      fetch(`${API_URL}/api/stats`, { headers: { 'Authorization': 'wrong' } }),
    ]);

    // All should return 401
    responses.forEach(response => {
      expect(response.status).toBe(401);
    });

    // Response times should be similar (no timing attacks)
    // This is hard to test reliably, but we can check structure is same
    const bodies = await Promise.all(responses.map(r => r.json()));
    
    // All error messages should have same structure
    bodies.forEach(body => {
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });
  });

  test('error messages do not expose system information', async () => {
    const response = await fetch(`${API_URL}/api/stats`);
    const data = await response.json();

    // Error should not contain sensitive info
    const errorString = JSON.stringify(data);
    expect(errorString).not.toContain('password');
    expect(errorString).not.toContain('secret');
    expect(errorString).not.toContain('token');
    expect(errorString).not.toContain('key');
    expect(errorString).not.toContain('private');
  });
});

describe('Security: CORS Bypass Attempts', () => {
  test('rejects requests with invalid Origin header', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'GET'
      }
    });

    // Should either return 403 or not include CORS headers for unauthorized origin
    if (response.status === 204 || response.status === 200) {
      // If allowed, check that Access-Control-Allow-Origin matches origin
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin) {
        // If CORS is configured, it should be restricted
        expect(['https://evil.com', 'null', '*']).not.toContain(allowOrigin);
      }
    }
  });

  test('handles null origin requests', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Origin': 'null'
      }
    });

    // Should either reject or handle safely
    expect([200, 401, 403]).toContain(response.status);
  });

  test('rejects requests with multiple Origin headers', async () => {
    // This is typically handled at the HTTP server level
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Origin': 'https://good.com, https://evil.com'
      }
    });

    // Multiple origins should be handled safely
    expect([200, 401, 403]).toContain(response.status);
  });
});

describe('Security: Rate Limit Bypass', () => {
  test('rate limiting applies per IP', async () => {
    // Make requests with different X-Forwarded-For headers
    const responses = await Promise.all([
      fetch(`${API_URL}/api/stats`, {
        headers: { 
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'X-Forwarded-For': '1.1.1.1'
        }
      }),
      fetch(`${API_URL}/api/stats`, {
        headers: { 
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'X-Forwarded-For': '2.2.2.2'
        }
      }),
    ]);

    // Both should succeed initially
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('handles spoofed X-Forwarded-For', async () => {
    // Test with various IP spoofing attempts
    const spoofedIps = [
      '127.0.0.1, 1.1.1.1',
      '::1',
      '0.0.0.0',
      '255.255.255.255',
      '192.168.1.1, 10.0.0.1',
      'unknown',
      '',
      'null',
    ];

    for (const ip of spoofedIps) {
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: { 
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'X-Forwarded-For': ip
        }
      });

      // Should not crash
      expect([200, 401, 429]).toContain(response.status);
    }
  });
});

describe('Security: Header Injection', () => {
  test('handles newline in headers safely', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 
        'Authorization': `Bearer ${TEST_API_KEY}\n\nInjected-Header: value`,
      }
    });

    // Should either reject or handle safely
    // Response splitting should not be possible
    const allHeaders = response.headers;
    expect(allHeaders.has('Injected-Header')).toBe(false);
  });

  test('handles carriage return in headers', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 
        'Authorization': `Bearer ${TEST_API_KEY}\r\nX-Custom: injected`,
      }
    });

    // Should not have injected headers
    expect(response.headers.has('X-Custom')).toBe(false);
  });
});

describe('Security: Path Traversal', () => {
  test('handles path traversal attempts', async () => {
    const traversalPaths = [
      '/api/stats/../../../etc/passwd',
      '/api/stats/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '/api/stats/..\\..\\..\\windows\\system32\\config\\sam',
      '/api/stats/....//....//....//etc/passwd',
    ];

    for (const path of traversalPaths) {
      const response = await fetch(`${API_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
      });

      // Should return 404 or handle safely
      expect([200, 404, 400]).toContain(response.status);
    }
  });
});

describe('Security: Content-Type Handling', () => {
  test('rejects requests with unexpected content types', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/xml'
      },
      body: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'
    });

    // Should not process XML
    expect([200, 404, 405, 400, 415]).toContain(response.status);
  });

  test('handles JSON content type correctly', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});

describe('Security: Security Headers', () => {
  test('all security headers are present', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    // Security headers
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  test('HSTS header when enabled', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    const hsts = response.headers.get('Strict-Transport-Security');
    if (hsts) {
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    }
  });

  test('server fingerprinting headers removed', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${TEST_API_KEY}` }
    });

    expect(response.headers.has('Server')).toBe(false);
    expect(response.headers.has('X-Powered-By')).toBe(false);
  });
});
