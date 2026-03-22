# Security Documentation

This document describes the security architecture implemented for the Resufolio Stats API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Rate Limiting](#rate-limiting)
5. [CORS Configuration](#cors-configuration)
6. [Security Headers](#security-headers)
7. [Environment Variables](#environment-variables)
8. [API Endpoints](#api-endpoints)
9. [Testing](#testing)

## Overview

The Stats API implements multiple layers of security to protect system information from unauthorized access while allowing legitimate portfolio site access:

- **API Key Authentication**: Bearer token validation
- **Rate Limiting**: Per-IP request throttling
- **CORS Protection**: Origin whitelist enforcement
- **Security Headers**: HSTS, CSP, XSS protection

## Authentication

### API Key Authentication

All API endpoints (except health check) require authentication via Bearer token in the Authorization header:

```http
Authorization: Bearer <your-api-key>
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure API key:
   ```bash
   openssl rand -base64 32
   ```

3. Add to `.env`:
   ```env
   STATS_API_KEY=your-secure-api-key
   ```

4. **Never commit `.env` to version control!**

### Unauthenticated Requests

Requests without valid authentication receive:

```json
{
  "error": "Unauthorized",
  "message": "Valid API key required",
  "requestId": "unique-request-id"
}
```

Status: **401 Unauthorized**

## Authorization

### Role-Based Access

Current implementation uses a single API key for all stats endpoints. Future enhancements may include:

- Read-only vs Write permissions
- Admin endpoints for configuration
- Multiple API keys with different scopes

### Protected Endpoints

| Endpoint | Authentication Required |
|----------|------------------------|
| `/api/health` | No |
| `/api/stats` | Yes |
| `/api/docker` | Yes |

## Rate Limiting

### Configuration

```env
RATE_LIMIT_READS_PER_MINUTE=100
RATE_LIMIT_WRITES_PER_MINUTE=20
```

### Limits

- **Read Operations (GET)**: 100 requests per minute per IP
- **Write Operations (POST/PUT/DELETE)**: 20 requests per minute per IP

### Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

### Rate Limit Exceeded

When limits are exceeded:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "requestId": "unique-request-id"
}
```

Status: **429 Too Many Requests**

Headers:
```http
Retry-After: 45
```

## CORS Configuration

### Whitelist Configuration

```env
ALLOWED_ORIGINS=https://your-portfolio.com,https://www.your-portfolio.com
```

### Behavior

- Requests from whitelisted origins: **Allowed**
- Requests without Origin header (curl, server-to-server): **Allowed**
- Requests from unknown origins: **Blocked (403)**

### CORS Preflight

The API properly handles OPTIONS preflight requests for browser-based requests.

### CORS Error Response

```json
{
  "error": "CORS policy violation",
  "requestId": "unique-request-id"
}
```

Status: **403 Forbidden**

## Security Headers

### Implemented Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |
| `Permissions-Policy` | Various restrictions | Feature policy |
| `Strict-Transport-Security` | `max-age=31536000` | HSTS (if enabled) |
| `X-Request-ID` | UUID | Request tracking |

### HSTS Configuration

For HTTPS deployments:

```env
ENABLE_HSTS=true
HSTS_MAX_AGE=31536000
```

This enforces HTTPS for all subdomains for 1 year.

## Environment Variables

### Required Variables

```env
# Authentication
STATS_API_KEY=your-secure-api-key-here-change-this-in-production

# CORS (optional, allows all if not set)
ALLOWED_ORIGINS=https://your-domain.com

# Rate Limiting (optional, has defaults)
RATE_LIMIT_READS_PER_MINUTE=100
RATE_LIMIT_WRITES_PER_MINUTE=20

# Security Headers (optional)
ENABLE_HSTS=true
HSTS_MAX_AGE=31536000
```

### Security Best Practices

1. **Generate strong API keys**: Use `openssl rand -base64 32`
2. **Rotate keys regularly**: Set a calendar reminder
3. **Use environment variables**: Never hardcode secrets
4. **Restrict origins**: Only allow your actual domain(s)
5. **Enable HSTS**: For production HTTPS deployments

## API Endpoints

### Health Check

```http
GET /api/health
```

No authentication required. Returns service status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### System Stats

```http
GET /api/stats
Authorization: Bearer <api-key>
```

Returns CPU, memory, disk, and OS information.

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "12345-abc",
  "cpu": { "usage": 45.2, "cores": 8 },
  "memory": { "total": 16777216000, "used": 8589934592, "usagePercent": "51.20" },
  "disk": [...],
  "system": { "platform": "linux", ... }
}
```

### Docker Stats

```http
GET /api/docker
Authorization: Bearer <api-key>
```

Returns Docker container and system information.

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "12345-abc",
  "system": { "containers": { "running": 5, ... } },
  "containers": [...]
}
```

## Testing

### Manual Testing

1. **Test Health Check (No Auth):**
   ```bash
   curl http://localhost:5173/api/health
   ```

2. **Test Without Authentication:**
   ```bash
   curl http://localhost:5173/api/stats
   # Should return 401
   ```

3. **Test With Authentication:**
   ```bash
   curl -H "Authorization: Bearer $STATS_API_KEY" \
        http://localhost:5173/api/stats
   ```

4. **Test Rate Limiting:**
   ```bash
   for i in {1..105}; do
     curl -H "Authorization: Bearer $STATS_API_KEY" \
          http://localhost:5173/api/stats
   done
   # Last requests should return 429
   ```

5. **Test CORS:**
   ```bash
   curl -H "Origin: https://evil.com" \
        -H "Authorization: Bearer $STATS_API_KEY" \
        http://localhost:5173/api/stats
   # Should return 403 if evil.com not in ALLOWED_ORIGINS
   ```

### Security Checklist

Before deploying to production:

- [ ] Strong API key generated and configured
- [ ] `.env` file added to `.gitignore`
- [ ] CORS origins restricted to actual domains
- [ ] HSTS enabled for HTTPS deployments
- [ ] Rate limits configured appropriately
- [ ] API key securely distributed to client
- [ ] Health endpoint accessible for monitoring
- [ ] Docker socket properly secured (if using Docker)

## Troubleshooting

### 401 Unauthorized

- Check Authorization header format: `Bearer <key>`
- Verify STATS_API_KEY environment variable is set
- Ensure no extra whitespace in key

### 403 CORS Error

- Verify Origin header is sent by browser
- Check ALLOWED_ORIGINS includes your domain
- Ensure protocol matches (http vs https)

### 429 Rate Limited

- Check X-RateLimit-Reset header
- Implement client-side request throttling
- Consider increasing limits if legitimate use

### 500 Server Error

- Check server logs for stack traces
- Verify Docker socket access (for /api/docker)
- Ensure systeminformation permissions

## Future Enhancements

Potential security improvements:

1. **API Key Rotation**: Automated key rotation mechanism
2. **JWT Authentication**: Token-based auth with expiration
3. **IP Whitelisting**: Restrict access by IP address
4. **Audit Logging**: Log all API access attempts
5. **Request Signing**: HMAC signature verification
6. **mTLS**: Mutual TLS authentication
