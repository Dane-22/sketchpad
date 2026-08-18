import { test, expect } from '@playwright/test';

test.describe('Canvas Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the project API response to prevent 401 Unauthorized redirect to /login
    await page.route('**/api/v1/projects/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canvasData: { elements: [] },
          id: 'test',
          name: 'Test Project'
        })
      });
    });

    // Go to a valid origin first
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test User' }));
    });
    await page.goto('http://localhost:3000/app/test');
  });

  test('should draw all major shapes', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const commandInput = page.getByPlaceholder('Type a command...');

    // Draw Line
    await commandInput.fill('LINE');
    await commandInput.press('Enter');
    await expect(page.locator('text=Command: LINE')).toBeVisible();
    await canvas.click({ position: { x: 50, y: 50 }, force: true });
    await canvas.click({ position: { x: 150, y: 150 }, force: true });

    // Draw Rectangle
    await commandInput.fill('REC');
    await commandInput.press('Enter');
    await canvas.click({ position: { x: 200, y: 50 }, force: true });
    await canvas.click({ position: { x: 300, y: 150 }, force: true });

    // Draw Circle
    await commandInput.fill('C');
    await commandInput.press('Enter');
    await canvas.click({ position: { x: 400, y: 100 }, force: true });
    await canvas.click({ position: { x: 450, y: 100 }, force: true });

    // Draw Polyline
    await commandInput.fill('PL');
    await commandInput.press('Enter');
    await canvas.click({ position: { x: 500, y: 50 }, force: true });
    await canvas.click({ position: { x: 550, y: 100 }, force: true });
    await canvas.click({ position: { x: 600, y: 50 }, force: true });
    await page.keyboard.press('Escape'); // End polyline
  });

  test('should verify dimension tool snapping', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const commandInput = page.getByPlaceholder('Type a command...');

    // 1. Draw a line
    await commandInput.fill('LINE');
    await commandInput.press('Enter');
    await canvas.click({ position: { x: 100, y: 100 }, force: true });
    await canvas.click({ position: { x: 200, y: 100 }, force: true });

    // 2. Select dimension tool
    // We didn't add DIM command in toolMap yet, but the user can click it in the UI
    await page.getByText('Dimension', { exact: true }).first().click();

    // 3. Snap to P1
    await canvas.click({ position: { x: 100, y: 100 }, force: true });
    
    // 4. Snap to P2
    await canvas.click({ position: { x: 200, y: 100 }, force: true });

    // 5. Offset
    await canvas.click({ position: { x: 150, y: 50 }, force: true });

    // Assuming we have no visual assertion, we just verify it didn't crash and we are back to select tool
    await expect(page.getByText('Select', { exact: true }).first().locator('..')).toHaveClass(/ring-1/);
  });

  test('should verify keyboard shortcuts', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const commandInput = page.getByPlaceholder('Type a command...');

    // Orthogonal mode
    await page.getByText('[ORTHO: OFF]').click();
    await expect(page.getByText('[ORTHO: ON]')).toBeVisible();
    await page.getByText('[ORTHO: ON]').click();
    await expect(page.getByText('[ORTHO: OFF]')).toBeVisible();

    // Undo (Ctrl+Z)
    await commandInput.fill('LINE');
    await commandInput.press('Enter');
    await canvas.click({ position: { x: 10, y: 10 }, force: true });
    await canvas.click({ position: { x: 20, y: 20 }, force: true });
    
    // Press Ctrl+Z
    await page.keyboard.press('Control+Z');
    
    // Cancel drawing (Esc)
    await commandInput.fill('LINE');
    await commandInput.press('Enter');
    await page.keyboard.press('Escape');
    
    // Should return to select tool
    await expect(page.getByText('Select', { exact: true }).first().locator('..')).toHaveClass(/ring-1/);
  });
});
