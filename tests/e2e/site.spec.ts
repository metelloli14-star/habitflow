import { expect, test } from '@playwright/test';

test('link preview, favicons and the install manifest are in place', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/poleznyeprivychki\.ru\/opengraph-image\.jpg/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Привычка — в ритме жизни');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');

  for (const [path, type] of [
    ['/favicon.ico', 'image/x-icon'], ['/icons/icon.svg', 'image/svg+xml'], ['/icons/icon-192.png', 'image/png'],
    ['/icons/icon-512.png', 'image/png'], ['/opengraph-image.jpg', 'image/jpeg'], ['/badge.png', 'image/png'],
  ]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain(type);
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/app' });
  expect((await request.get('/sw.js')).headers()['cache-control']).toContain('no-cache');
});

test('privacy policy describes push notifications and analytics', async ({ page }) => {
  await page.goto('/legal/privacy-policy');
  await expect(page.getByText(/Push-уведомления доставляются через сервис уведомлений/)).toBeVisible();
  await expect(page.getByText(/Яндекс Метрику/).first()).toBeVisible();
});

test('the API refuses strangers', async ({ request }) => {
  expect((await request.get('/api/auth/me')).status()).toBe(401);
  expect((await request.get('/api/profile/avatar')).status()).toBe(401);
  expect((await request.get('/api/habits')).status()).toBe(401);
  const key = await (await request.get('/api/push/key')).json();
  expect(typeof key.publicKey).toBe('string');
});

test('screens of the app need a login', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/welcome$/);
});
