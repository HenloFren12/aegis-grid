import { test, expect } from '@playwright/test';

test.describe('Aegis Command Center E2E - CI Suite', () => {
  test('App boots without crashing', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
    expect(await page.title()).not.toBe('');
  });

  test('Public SOS endpoint renders and is accessible', async ({ page }) => {
    await page.goto('/sos');

    await expect(
      page.getByRole('heading', { name: 'Emergency SOS', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /SEND EMERGENCY SOS/i }),
    ).toBeVisible();
  });
});