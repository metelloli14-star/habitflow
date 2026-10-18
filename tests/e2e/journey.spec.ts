import { expect, test, type Page } from '@playwright/test';

// The person's way through the app, in a phone-sized browser against the production build.
const INBOX = `http://127.0.0.1:${process.env.E2E_INBOX_PORT || 4026}`;
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function codeSentTo(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${INBOX}/code?to=${encodeURIComponent(email)}`);
    if (res.ok) return (await res.json()).code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No letter with a code for ${email}`);
}

async function loginAsDemo(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('demo@habitflow.ru');
  await page.locator('#login-pass').fill('demo12345');
  await page.getByRole('button', { name: /Согласен/ }).click();
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.today-habit-row').first()).toBeVisible();
}

test('registration: letter with a code → install guide → home', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/register');
  await expect(page.locator('.auth-divider')).toHaveCount(0); // no lonely "— или —" while VK ID is off
  await page.locator('#reg-name').fill('Тест');
  await page.locator('#reg-email').fill(email);
  await page.locator('#reg-pass').fill('password123');
  await page.locator('#reg-pass2').fill('password123');
  await page.getByRole('button', { name: /Согласен/ }).click();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/\/confirm/);

  const code = await codeSentTo(email); // went through real SMTP
  await page.locator('input[inputmode="numeric"]').first().click();
  await page.keyboard.type(code);
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page).toHaveURL(/\/start$/);

  await page.getByRole('link', { name: 'Начать' }).click();
  await expect(page).toHaveURL(/\/install$/);
  await expect(page.getByRole('heading', { name: 'Установите «Привычку» на телефон' })).toBeVisible();
  await expect(page.locator('.install-step')).toHaveCount(4);
  await page.getByRole('radio', { name: 'Android' }).click();
  await expect(page.getByText('Выберите «Установить приложение»')).toBeVisible();
  await page.getByRole('button', { name: 'Спасибо, я понял' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'Привет, Тест!' })).toBeVisible();
});

test('tabs switch without loading spinners; the bottom menu stays the same element', async ({ page }) => {
  await loginAsDemo(page);
  await page.waitForTimeout(1500); // the layout loads the other tabs' data meanwhile
  await page.evaluate(() => {
    (document.querySelector('.home-bottom-nav') as HTMLElement & { e2e?: boolean }).e2e = true;
    const w = window as Window & { sawSpinner?: boolean };
    w.sawSpinner = false;
    new MutationObserver(() => {
      if (document.querySelector('.screen-loading')) w.sawSpinner = true;
    }).observe(document.body, { subtree: true, childList: true });
  });
  for (const [label, path] of [['ВОДА', '/water'], ['ПРИВЫЧКИ', '/habits'], ['ЦЕЛИ', '/goals'], ['ГЛАВНАЯ', '/home']]) {
    await page.locator('.home-bottom-nav').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('.screen')).toHaveCount(1);
  }
  expect(await page.evaluate(() => (window as Window & { sawSpinner?: boolean }).sawSpinner)).toBe(false);
  expect(await page.evaluate(() => (document.querySelector('.home-bottom-nav') as HTMLElement & { e2e?: boolean }).e2e)).toBe(true);
});

test('marking all of today\'s habits: green rows and a congratulation', async ({ page }) => {
  await loginAsDemo(page);
  const rows = page.locator('.today-habit-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    if ((await row.getAttribute('aria-pressed')) !== 'true') await row.click();
    await expect(row).toHaveClass(/done/);
  }
  await expect(page.locator('.progress-ring')).toHaveClass(/complete/);
  const modal = page.locator('.modal-overlay.celebrate.open');
  await expect(modal).toContainText('Ты на шаг ближе к своей цели!');
  await expect(modal).toContainText('Поздравляю!');
  while (await modal.count()) await modal.getByRole('button', { name: 'Отлично' }).click();
});

test('yesterday can be marked from the home screen', async ({ page }) => {
  await loginAsDemo(page);
  await page.getByRole('tab', { name: 'Вчера' }).click();
  await expect(page.getByRole('heading', { name: 'Вчерашние привычки' })).toBeVisible();
  const row = page.locator('.today-habit-row').first();
  const before = await row.getAttribute('aria-pressed');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  await page.getByRole('tab', { name: 'Сегодня' }).click();
  await expect(page.getByRole('heading', { name: 'Сегодняшние привычки' })).toBeVisible();
});

test('statistics, menu and the habit history calendar', async ({ page }) => {
  await loginAsDemo(page);
  await page.locator('a[href="/menu"]').first().click();
  for (const item of ['Личный кабинет', 'Мои привычки', 'Цели', 'Статистика']) {
    await expect(page.getByRole('link', { name: new RegExp(item) })).toBeVisible();
  }
  await page.getByRole('link', { name: /Статистика/ }).click();
  await expect(page.locator('.wk-chart')).toHaveCount(2);
  await expect(page.getByText('Привычки за неделю')).toBeVisible();
  await expect(page.locator('.stats-card-pill.goal')).toHaveText('цель 2,0 л');

  await page.goto('/habits');
  await page.locator('a.habit-edit-btn').first().click();
  await expect(page.getByText('История выполнения')).toBeVisible();
  const cells = await page.locator('.heatmap-cell').count(); // 8–16 weeks, depending on the habit's age
  expect(cells % 7).toBe(0);
  expect(cells).toBeGreaterThanOrEqual(8 * 7);
  expect(cells).toBeLessThanOrEqual(16 * 7);
  await expect(page.locator('.heatmap-cell.done').first()).toBeVisible();
});

test('profile photo is uploaded once and then served by URL', async ({ page }) => {
  await loginAsDemo(page);
  await page.goto('/profile');
  await page.locator('input[type="file"]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(page.getByRole('button', { name: 'Удалить фото' })).toBeVisible();
  const consent = page.locator('.profile-consent-check');
  if ((await consent.getAttribute('aria-pressed')) !== 'true') await consent.click();
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.locator('.modal-overlay.open')).toBeVisible();

  const me = await page.evaluate(async () => (await fetch('/api/auth/me')).json());
  expect(me.avatar).toMatch(/^\/api\/profile\/avatar\?v=[\w-]+$/);
  const photo = await page.evaluate(async (url) => {
    const res = await fetch(url);
    return { status: res.status, type: res.headers.get('content-type'), cache: res.headers.get('cache-control') };
  }, me.avatar);
  expect(photo).toEqual({ status: 200, type: 'image/jpeg', cache: 'private, max-age=31536000, immutable' });
});

test('notification settings (water reminders, weekly summary) are saved', async ({ page }) => {
  await loginAsDemo(page);
  const patch = (body: object) => page.evaluate(async (b) => (await fetch('/api/profile', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
  })).json(), body);
  expect(await patch({ waterReminders: false, weeklySummary: false })).toMatchObject({ waterReminders: false, weeklySummary: false });
  expect(await patch({ waterReminders: true })).toMatchObject({ waterReminders: true, weeklySummary: false });
  await patch({ weeklySummary: true });
});
