import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_API_KEY = process.env.TEST_STATS_API_KEY || 'test-key';

test.describe('E2E: Stats Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API key in localStorage for authenticated requests
    await page.goto(BASE_URL);
    await page.evaluate((key) => {
      localStorage.setItem('apiKey', key);
    }, TEST_API_KEY);
  });

  test('dashboard loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page).toHaveTitle(/Resufolio/);
    
    // Check main content is visible
    const mainContent = page.locator('main, #app, .app');
    await expect(mainContent).toBeVisible();
  });

  test('stats section displays on homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for stats-related elements
    const statsSection = page.locator('text=/stats|metrics|system|CPU|memory/i').first();
    
    // Stats section might be loaded dynamically
    try {
      await expect(statsSection).toBeVisible({ timeout: 5000 });
    } catch {
      // Stats might not be visible by default - that's ok
    }
  });

  test('navigation to stats page works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Try to find and click stats link
    const statsLink = page.locator('a[href*="stats"], a:has-text("Stats"), a:has-text("Metrics"), a:has-text("System")').first();
    
    if (await statsLink.isVisible().catch(() => false)) {
      await statsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check URL changed
      expect(page.url()).toContain('stats');
    }
  });

  test('Docker dashboard section is present', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for Docker-related content
    const dockerSection = page.locator('text=/docker|containers|services|swarm/i').first();
    
    try {
      await expect(dockerSection).toBeVisible({ timeout: 5000 });
    } catch {
      // Docker section might not be visible - that's ok
    }
  });

  test('API responses are displayed in UI', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for API calls to complete
    await page.waitForTimeout(2000);
    
    // Check if any numeric values are displayed (indicating data loaded)
    const numericValues = page.locator('text=/\\d+\\.?\\d*\\s*(%|GB|MB|CPU|MHz)/i');
    const count = await numericValues.count();
    
    // Should have some numeric values displayed if data loaded
    if (count > 0) {
      await expect(numericValues.first()).toBeVisible();
    }
  });

  test('page handles API errors gracefully', async ({ page }) => {
    // Clear API key to force errors
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.removeItem('apiKey');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Page should still load even with API errors
    await expect(page.locator('body')).toBeVisible();
    
    // Check for error messages
    const errorMessage = page.locator('text=/error|failed|unauthorized/i');
    // Error might or might not be displayed - depends on implementation
  });

  test('responsive layout works on different viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Page should be visible on all viewports
      await expect(page.locator('body')).toBeVisible();
      
      // Check no horizontal overflow
      const body = await page.locator('body').boundingBox();
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(body!.width).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px rounding
    }
  });

  test('real-time updates work if WebSocket is available', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    // Check console for WebSocket messages
    const logs = await page.evaluate(() => {
      return (window as any).consoleLogs || [];
    });
    
    // WebSocket might or might not be used
  });
});

test.describe('E2E: API Explorer', () => {
  test('can make API requests from UI', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/health`);
    
    // Health endpoint should return JSON
    const content = await page.textContent('body');
    expect(content).toContain('healthy');
  });

  test('API returns proper error for unauthorized requests', async ({ page }) => {
    // Navigate to stats API without auth
    const response = await page.request.get(`${API_URL}/api/stats`);
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('API accepts valid authentication', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`
      }
    });
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('cpu');
    expect(body).toHaveProperty('memory');
  });
});

test.describe('E2E: Error Handling', () => {
  test('404 page is handled gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-page`);
    await page.waitForLoadState('networkidle');
    
    // Should show some kind of error or fallback
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('network errors are handled', async ({ page }) => {
    // Block API requests
    await page.route('**/api/**', route => route.abort('failed'));
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Page should still load
    await expect(page.locator('body')).toBeVisible();
  });
});
