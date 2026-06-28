import { test, expect } from '@playwright/test';

test('demo loads and the user message renders optimistically', async ({ page }) => {
  let serverUp = true;
  try { const r = await fetch('http://localhost:5173/'); if (!r.ok) serverUp = false; }
  catch { serverUp = false; }
  test.skip(!serverUp, 'dev server not running on :5173');

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('textarea', { timeout: 10_000 });
  const probe = 'Say the word PONG and nothing else';
  await page.fill('textarea', probe);
  await page.keyboard.press('Enter');
  // The optimistic user message MUST appear within 2s regardless of API
  // outcome — we assert on the message text (every Message renders its
  // content into the DOM as soon as the optimistic push lands).
  await expect(page.getByText(probe).first()).toBeVisible({ timeout: 2_000 });
  await page.screenshot({ path: '/tmp/ai-schadcn-chat-e2e.png', fullPage: true });
});
