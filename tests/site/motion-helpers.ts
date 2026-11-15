import { expect, type Page } from '@playwright/test';
export async function ready(page: Page) {
  await page.waitForFunction(() => Boolean(window.swup) && document.documentElement.dataset.ireinaMotionBound === 'true' && getComputedStyle(document.documentElement).getPropertyValue('--mc-primary').trim() !== '');
  await expect(page.locator('#display-setting input[aria-label="减少动态效果"]')).toBeAttached();
  await page.waitForFunction(() => [...document.querySelectorAll('#navbar, #content-wrapper')].every(el => Number(getComputedStyle(el).opacity) > 0.99));
}
export async function toggleMotion(page: Page, reduced: boolean) {
  const panel = page.locator('#display-setting');
  if (await panel.evaluate(el => el.classList.contains('float-panel-closed'))) await page.locator('#display-settings-switch').click();
  const input = page.locator('#display-setting input[aria-label="减少动态效果"]');
  if (await input.isChecked() !== reduced) {
    await input.locator('..').scrollIntoViewIfNeeded();
    await input.locator('..').click();
  }
  await expect(input).toBeChecked({ checked: reduced });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('motion-reduced'))).toBe(reduced);
}
export async function motionSnapshot(page: Page) {
  return page.evaluate(() => {
    const wave = document.querySelector('.banner-waves__layer')!;
    const texture = document.getElementById('m3e-texture-canvas')!;
    const subtitle = document.querySelector('[data-banner-home-copy] p');
    return { reduced: document.documentElement.classList.contains('motion-reduced'), wave: getComputedStyle(wave).animationName, texture: getComputedStyle(texture).animationName, typing: subtitle?.getAttribute('data-subtitle-state'), saved: localStorage.getItem('mc-motion') };
  });
}
