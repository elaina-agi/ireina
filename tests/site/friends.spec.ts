import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// 友链申请表单只在配置了 PUBLIC_TURNSTILE_SITE_KEY 时显示。
// 这里自己读一遍根目录的 .env(和开发服务器读的是同一份)来判断该测哪种情况:
//   填了 → 测表单本身;没填 → 只检查「表单不出现」。
// 被测的服务器不是用 .env 启动的时候(比如用命令行变量另起一个),用 FRIEND_APPLY_FORM=1 / 0 强制指定:
//   PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA node node_modules/astro/bin/astro.mjs dev --port 4322 --host 127.0.0.1 --ignore-lock
//   TEST_BASE_URL=http://127.0.0.1:4322 FRIEND_APPLY_FORM=1 pnpm exec playwright test tests/site/friends.spec.ts
// Turnstile 脚本和提交接口(/api/friend-apply)都用假的代替:测试不访问外网,也不会真的发邮件。
const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const configured = Boolean((process.env.PUBLIC_TURNSTILE_SITE_KEY ?? fileEnv.PUBLIC_TURNSTILE_SITE_KEY ?? '').trim());
const withForm = process.env.FRIEND_APPLY_FORM ? process.env.FRIEND_APPLY_FORM === '1' : configured;
const form = (page: Page) => page.locator('.friend-apply');

async function mock(page: Page, reply: { status: number; body: unknown }) {
  const requests: any[] = [];
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile = { render(el, o) { window.__ts = { o, resets: 0 }; setTimeout(() => o.callback('test-token'), 0); return 'w1'; }, reset() { window.__ts.resets++; setTimeout(() => window.__ts.o.callback('test-token-2'), 0); }, remove() {} };`,
  }));
  await page.route('**/api/friend-apply', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
  });
  return requests;
}

async function fill(page: Page) {
  await page.locator('#friend-apply-name').fill('测试站');
  await page.locator('#friend-apply-url').fill('https://friend.example.invalid');
  await page.locator('#friend-apply-avatar').fill('https://friend.example.invalid/a.png');
  await page.locator('#friend-apply-desc').fill('一个测试站点');
  await page.locator('#friend-apply-email').fill('friend@example.invalid');
}

test('friends page has no apply form when it is not configured', async ({ page }) => {
  test.skip(withForm, '当前服务器配置了表单');
  await page.goto('/friends/');
  await expect(page.locator('.friend-section h1')).toBeVisible();
  await expect(form(page)).toHaveCount(0);
});

test.describe('friend apply form', () => {
  test.skip(!withForm, '当前服务器没有配置友链申请表单');

  test('validates locally, then submits and shows success', async ({ page }) => {
    const requests = await mock(page, { status: 200, body: { ok: true } });
    await page.goto('/friends/');
    await expect(form(page)).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).__ts));
    await form(page).getByRole('button', { name: '提交申请' }).click();
    await expect(form(page).locator('.m3-text-field__error')).toHaveCount(5);
    await expect(page.locator('#friend-apply-name')).toBeFocused();
    expect(requests).toHaveLength(0);

    await fill(page);
    await page.locator('#friend-apply-url').fill('not a url');
    await form(page).getByRole('button', { name: '提交申请' }).click();
    await expect(form(page).locator('.m3-text-field__error')).toHaveText(['请填写以 http:// 或 https:// 开头的完整地址']);
    await page.locator('#friend-apply-url').fill('https://friend.example.invalid');

    await form(page).getByRole('button', { name: '提交申请' }).click();
    await expect(form(page).getByRole('status')).toHaveText('申请已提交，谢谢！博主看到后会回复你。');
    expect(requests).toEqual([{ name: '测试站', url: 'https://friend.example.invalid', avatar: 'https://friend.example.invalid/a.png', desc: '一个测试站点', email: 'friend@example.invalid', website: '', token: 'test-token' }]);
    await expect(page.locator('#friend-apply-name')).toHaveValue('');
    expect(await page.evaluate(() => (window as any).__ts.resets)).toBe(1);
  });

  test('shows rate limit and server errors, keeps what was typed', async ({ page }) => {
    await mock(page, { status: 429, body: { ok: false, error: 'rate_limited' } });
    await page.goto('/friends/');
    await page.waitForFunction(() => Boolean((window as any).__ts));
    await fill(page);
    await form(page).getByRole('button', { name: '提交申请' }).click();
    await expect(form(page).getByRole('status')).toHaveText('提交太频繁了，请稍后再试');
    await expect(page.locator('#friend-apply-name')).toHaveValue('测试站');
  });

  test('works after in-site navigation and passes accessibility checks', async ({ page }) => {
    await mock(page, { status: 200, body: { ok: true } });
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as any).swup));
    await page.evaluate(() => (window as any).swup.navigate('/friends/'));
    await expect(form(page)).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).__ts));
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      const result = await new AxeBuilder({ page }).include('.friend-apply').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
    }
  });
});
