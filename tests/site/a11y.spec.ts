import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ready, toggleMotion } from './motion-helpers';
for (const colorScheme of ['light','dark'] as const) {
  test(`motion controls remain keyboard accessible in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion:'reduce' });
    await page.goto('/'); await ready(page); await toggleMotion(page, true);
    const input = page.locator('#display-setting input[aria-label="减少动态效果"]');
    await input.focus(); await page.keyboard.press('Space'); await expect(input).not.toBeChecked();
    await page.keyboard.press('Space'); await expect(input).toBeChecked();
    const result = await new AxeBuilder({ page }).include('#display-setting').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  });
}
