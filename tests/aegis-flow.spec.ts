import { test, expect } from '@playwright/test';

test.describe('Aegis Command Center E2E - CI Suite', () => {
  
  test('App boots without crashing', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Just verifies the React app successfully mounts in the CI environment
    expect(await page.title()).not.toBe('');
  });

  test('Public SOS endpoint renders and is accessible', async ({ page }) => {
    await page.goto('http://localhost:5173/sos');
    
    // The bot CAN see this because it is not behind AuthGuard
    await expect(page.locator('text=Emergency SOS')).toBeVisible();
    await expect(page.locator('button', { hasText: 'SEND SOS NOW' })).toBeVisible();
  });
  
});