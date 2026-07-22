import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('Navigating...');
  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  console.log('URL:', page.url());
  await page.waitForTimeout(3000);

  const inputs = await page.locator('input').evaluateAll((els) =>
    els.map((el) => ({
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      aria: el.getAttribute('aria-label'),
      placeholder: el.getAttribute('placeholder'),
      id: el.id,
      visible: (el as HTMLElement).offsetParent !== null,
    })),
  );
  console.log('INPUTS:', JSON.stringify(inputs, null, 2));

  const username = process.env.IG_USERNAME!;
  const password = process.env.IG_PASSWORD!;

  const user = page
    .getByRole('textbox', { name: /mobile number|username|email/i })
    .or(page.getByPlaceholder(/mobile number|username|email/i))
    .or(page.locator('input[name="username"]:visible'));

  console.log('username visible?', await user.isVisible().catch(() => false));

  if (await user.isVisible().catch(() => false)) {
    await user.click();
    await user.fill(username);
    const pass = page.locator('input[type="password"]:visible').first();
    await pass.fill(password);
    await page.getByRole('button', { name: /^log[\s-]?in$/i }).click();
    console.log('Clicked login, waiting...');
    await page.waitForTimeout(8000);
    console.log('After login URL:', page.url());
  } else {
    console.log('Could not find username field. Page title:', await page.title());
    await page.screenshot({ path: 'reports/debug-login.png', fullPage: true });
  }

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
