import { test, expect } from '@playwright/test';
import { ready, toggleMotion, motionSnapshot } from './motion-helpers';

for (const system of ['reduce', 'no-preference'] as const) {
  test(`default follows system=${system}; an explicit blog choice then wins`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const systemReduced = system === 'reduce';
    await page.emulateMedia({ reducedMotion: system });
    await page.goto('/'); await ready(page);
    const initial = await motionSnapshot(page);
    expect(initial.reduced).toBe(systemReduced);
    expect(initial.saved).toBeNull();
    expect(initial.wave === 'none').toBe(systemReduced);
    expect(initial.texture === 'none').toBe(systemReduced);
    await expect.poll(async () => (await motionSnapshot(page)).typing).toBe(systemReduced ? 'complete' : 'typing');
    // An explicit choice opposite to the system setting is stored and survives reloads.
    await toggleMotion(page, !systemReduced);
    expect((await motionSnapshot(page)).saved).toBe(systemReduced ? 'full' : 'reduced');
    await expect.poll(async () => (await motionSnapshot(page)).wave === 'none').toBe(!systemReduced);
    await page.reload(); await ready(page);
    expect((await motionSnapshot(page)).reduced).toBe(!systemReduced);
    // Flipping the system setting no longer overrides the explicit choice.
    await page.emulateMedia({ reducedMotion: systemReduced ? 'no-preference' : 'reduce' });
    expect((await motionSnapshot(page)).reduced).toBe(!systemReduced);
    expect(errors).toEqual([]);
  });
}

test('unchosen visitors follow live system changes; reset returns to the system', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  expect((await motionSnapshot(page)).reduced).toBe(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await motionSnapshot(page)).reduced).toBe(true);
  expect((await motionSnapshot(page)).saved).toBeNull();
  await toggleMotion(page, false);
  expect((await motionSnapshot(page)).saved).toBe('full');
  await page.locator('#display-setting .ireina-reset-all button').click();
  await expect.poll(async () => (await motionSnapshot(page)).saved).toBeNull();
  expect((await motionSnapshot(page)).reduced).toBe(true);
  await expect(page.locator('#display-setting input[aria-label="减少动态效果"]')).toBeChecked();
});

test('stored choice survives client navigation and shared persistent widgets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  await toggleMotion(page, true);
  await page.evaluate(() => { (window as any).__motionShell = { kanban: (window as any).kanban, controls: document.getElementById('floating-controls') }; });
  await page.keyboard.press('Escape');
  await page.locator('.top-app-bar__nav a[data-nav-key="moments"]').click();
  await expect(page.locator('#swup-container')).toHaveAttribute('data-current-page', 'moments');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('motion-reduced'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__motionShell.kanban === (window as any).kanban && (window as any).__motionShell.controls === document.getElementById('floating-controls'))).toBe(true);
  await toggleMotion(page, false); await page.keyboard.press('Escape');
  await page.locator('.top-app-bar__nav a[data-nav-key="home"]').click();
  await expect(page.locator('#swup-container')).toHaveAttribute('data-current-page', 'home');
  await expect.poll(async () => (await motionSnapshot(page)).typing).toBe('typing');
});

test('mascot freezes and resumes without reloading or waking a sleeping widget', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  await page.waitForFunction(() => (window as any).kanban?.state === 'active', { timeout: 30000 });
  expect(await page.locator('kanban-widget').getAttribute('data-motion-reduced')).toBeNull();
  await page.evaluate(() => { (window as any).__motionModel = (window as any).kanban.l2d; });
  await toggleMotion(page, true);
  await expect.poll(() => page.evaluate(() => (window as any).kanban.l2d?._state.l2d6Model._drawFrameId)).toBeNull();
  await expect(page.locator('kanban-widget')).toHaveAttribute('data-motion-reduced', '');
  await toggleMotion(page, false);
  await expect.poll(() => page.evaluate(() => typeof (window as any).kanban.l2d?._state.l2d6Model._drawFrameId)).toBe('number');
  expect(await page.evaluate(() => (window as any).kanban.l2d === (window as any).__motionModel)).toBe(true);
  await toggleMotion(page, true);
  await page.evaluate(() => (window as any).kanban.sleep());
  await toggleMotion(page, false);
  expect(await page.evaluate(() => (window as any).kanban.state)).toBe('sleeping');
});

test('reduced mode stops music-panel transition and supports cross-tab preference', async ({ page, context }) => {
  await page.goto('/'); await ready(page);
  await toggleMotion(page, true); await page.keyboard.press('Escape');
  // The music button only renders when tracks or a playlist are configured.
  if (await page.locator('#floating-music-trigger').count()) {
    await page.locator('#floating-music-trigger').click();
    await expect(page.locator('#floating-music-panel')).toBeVisible();
    expect(await page.locator('.floating-music-sheet').evaluate(el => el.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
    await page.keyboard.press('Escape');
  }
  const second = await context.newPage(); await second.goto('/'); await ready(second);
  expect((await motionSnapshot(second)).reduced).toBe(true);
  await toggleMotion(second, false);
  await expect.poll(async () => (await motionSnapshot(page)).reduced).toBe(false);
  await second.close();
});

test('mobile retains independent feature defaults and motion control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  expect((await motionSnapshot(page)).wave).not.toBe('none');
  expect(await page.locator('.ireina-wall').count()).toBe(0);
  expect(await page.locator('#ireina-sakura').count()).toBe(0);
  await toggleMotion(page, true);
  expect((await motionSnapshot(page)).wave).toBe('none');
});

test('enabling reduced motion cancels an in-flight Swup scroll', async ({ page }) => {
  await page.goto('/moments/'); await ready(page);
  const positions = await page.evaluate(async () => {
    const swup = window.swup as any;
    swup.scrollTo(900, true);
    await new Promise(requestAnimationFrame);
    document.documentElement.classList.add('motion-reduced');
    window.dispatchEvent(new CustomEvent('ireina:motion-change', { detail: { reduced: true } }));
    const start = scrollY;
    await new Promise(resolve => setTimeout(resolve, 160));
    return { start, end: scrollY, frame: swup.findPlugin('SwupScrollPlugin').scrl._raf };
  });
  expect(positions.frame).toBeNull();
  expect(positions.end).toBe(positions.start);
});
