import { test, expect } from '@playwright/test';

test.describe('Aegis Command Center E2E', () => {
  
  test('Dashboard loads core enterprise components', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await expect(page.locator('text=Aegis Command Center')).toBeVisible();
    await expect(page.locator('text=Gate Risk Foresight')).toBeVisible();
    await expect(page.locator('text=Active Triage Queue')).toBeVisible();
  });

  test('Demo Crisis button is present and clickable', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    const crisisBtn = page.locator('button', { hasText: '⚠️ Simulate Crisis' });
    await expect(crisisBtn).toBeVisible();
  });

  test('Public SOS endpoint renders without authentication', async ({ page }) => {
    await page.goto('http://localhost:5173/sos');
    await expect(page.locator('text=Emergency SOS')).toBeVisible();
    await expect(page.locator('button', { hasText: 'SEND SOS NOW' })).toBeVisible();
  });

  test('Audit Ledger renders compliance headers', async ({ page }) => {
    await page.goto('http://localhost:5173/audit');
    await expect(page.locator('text=Command Center Ledger')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Export CSV for Compliance' })).toBeVisible();
  });
});
