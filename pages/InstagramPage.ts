import { Page, Locator, expect } from '@playwright/test';

export class InstagramPage {
  constructor(private readonly page: Page) {}

  async gotoLogin(): Promise<void> {
    await this.page.goto('/accounts/login/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    // Do not wait for networkidle — Instagram keeps long-polling forever
    await this.page.waitForTimeout(2_000);
    await this.dismissCookieBannerIfPresent();
  }

  async dismissCookieBannerIfPresent(): Promise<void> {
    const cookieButtons = [
      this.page.getByRole('button', { name: /allow all cookies/i }),
      this.page.getByRole('button', { name: /accept all/i }),
      this.page.getByRole('button', { name: /only allow essential cookies/i }),
      this.page.getByRole('button', { name: /decline optional cookies/i }),
    ];

    for (const button of cookieButtons) {
      if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await button.click();
        return;
      }
    }
  }

  private usernameInput(): Locator {
    // Current Instagram/Meta login uses name="email" (not "username")
    return this.page
      .locator('input[name="email"]:visible')
      .or(this.page.locator('input[name="username"]:visible'))
      .or(this.page.getByRole('textbox', { name: /mobile number|username|email/i }))
      .or(this.page.getByPlaceholder(/mobile number|username|email/i));
  }

  private passwordInput(): Locator {
    return this.page
      .locator('input[name="pass"]:visible')
      .or(this.page.locator('input[name="password"]:visible'))
      .or(this.page.locator('input[type="password"]:visible'));
  }

  private loginButton(): Locator {
    return this.page
      .getByRole('button', { name: /^log[\s-]?in$/i })
      .or(this.page.locator('button[type="submit"]:visible'));
  }

  async login(username: string, password: string): Promise<void> {
    if (this.page.url().includes('/accounts/onetap')) {
      return;
    }
    if (!this.page.url().includes('/accounts/login')) {
      // Already authenticated / redirected away from login
      const stillHasForm = await this.usernameInput().isVisible({ timeout: 2_000 }).catch(() => false);
      if (!stillHasForm) return;
    }

    const userField = this.usernameInput();
    await userField.waitFor({ state: 'visible', timeout: 30_000 });
    await userField.click();
    await userField.fill(username);

    const passField = this.passwordInput();
    await passField.click();
    await passField.fill(password);

    const submit = this.loginButton();
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await Promise.all([
      this.page
        .waitForURL(
          (url) =>
            !url.pathname.includes('/accounts/login') ||
            url.pathname.includes('/onetap') ||
            url.pathname.includes('/challenge'),
          { timeout: 60_000 },
        )
        .catch(() => undefined),
      submit.click(),
    ]);
  }

  async dismissPostLoginPrompts(): Promise<void> {
    const dismissLabels = [/not now/i, /dismiss/i, /cancel/i];

    for (let attempt = 0; attempt < 5; attempt++) {
      let dismissed = false;

      for (const label of dismissLabels) {
        const button = this.page.getByRole('button', { name: label });
        if (await button.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
          await button.first().click();
          dismissed = true;
          break;
        }
      }

      if (!dismissed) break;
      await this.page.waitForTimeout(800);
    }
  }

  async expectLoggedIn(): Promise<void> {
    await this.dismissPostLoginPrompts();

    const url = this.page.url();

    if (/challenge|checkpoint|auth_platform|two_factor/i.test(url)) {
      throw new Error(
        `Instagram requires a manual security check: ${url}. Complete it in the open browser window, then re-run.`,
      );
    }

    // Save-login (onetap) means credentials were accepted
    if (url.includes('/accounts/onetap')) {
      await this.dismissPostLoginPrompts();
      return;
    }

    await expect(this.page).not.toHaveURL(/\/accounts\/login/, { timeout: 60_000 });

    const homeIndicators = [
      this.page.getByRole('link', { name: /^home$/i }),
      this.page.locator('svg[aria-label="Home"]'),
      this.page.locator('a[href="/"]'),
    ];

    for (const indicator of homeIndicators) {
      if (await indicator.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }
    }

    // If we left the login page, treat as logged in enough to continue
    if (!/\/accounts\/login/.test(this.page.url())) {
      return;
    }

    throw new Error(`Login did not complete. Current URL: ${this.page.url()}`);
  }

  async openProfile(profile: string): Promise<void> {
    await this.dismissPostLoginPrompts();
    await this.page.goto(`/${profile}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await this.page.waitForTimeout(2_000);
    await this.dismissPostLoginPrompts();
    await expect(this.page).toHaveURL(new RegExp(`/${profile}/?`), { timeout: 30_000 });

    const heading = this.page.getByRole('heading', { name: profile, exact: true });
    if (await heading.isVisible({ timeout: 10_000 }).catch(() => false)) {
      return;
    }

    // Fallback: profile header link / username text
    const profileMarker = this.page.locator(`a[href="/${profile}/"]`).first();
    await expect(profileMarker).toBeVisible({ timeout: 20_000 });
  }

  private dialog(): Locator {
    return this.page.locator('div[role="dialog"]').last();
  }

  async getCountFromProfileLink(kind: 'followers' | 'following'): Promise<number | null> {
    const link = this.page.getByRole('link', {
      name: new RegExp(`[\\d,]+\\s+${kind}`, 'i'),
    });
    const text = await link.first().innerText().catch(() => '');
    const match = text.replace(/,/g, '').match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  async openFollowersDialog(_profile: string): Promise<void> {
    const followersLink = this.page
      .getByRole('link', { name: /[\d,]+\s+followers/i })
      .or(this.page.locator(`a[href$="/followers/"]`));

    await followersLink.first().click();
    await this.dialog().waitFor({ state: 'visible', timeout: 20_000 });
  }

  async openFollowingDialog(_profile: string): Promise<void> {
    const followingLink = this.page
      .getByRole('link', { name: /[\d,]+\s+following/i })
      .or(this.page.locator(`a[href$="/following/"]`));

    await followingLink.first().click();
    await this.dialog().waitFor({ state: 'visible', timeout: 20_000 });

    const peopleTab = this.dialog().getByRole('tab', { name: /^people$/i });
    if (await peopleTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await peopleTab.click();
      await this.page.waitForTimeout(800);
    }
  }

  async closeDialog(): Promise<void> {
    const closeButton = this.dialog().locator('svg[aria-label="Close"]').locator('..');

    if (await closeButton.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeButton.first().click();
    } else {
      await this.page.keyboard.press('Escape');
    }

    await this.dialog().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  }

  /**
   * Scrolls the Instagram followers/following modal and collects unique usernames.
   */
  async extractUsernamesFromDialog(options?: {
    maxIdleRounds?: number;
    settleMs?: number;
    excludeUsername?: string;
    expectedCount?: number | null;
  }): Promise<string[]> {
    const maxIdleRounds = options?.maxIdleRounds ?? 10;
    const settleMs = options?.settleMs ?? 1_000;
    const exclude = (options?.excludeUsername ?? '').toLowerCase();
    const expected = options?.expectedCount ?? null;
    const dialog = this.dialog();
    await dialog.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(1_000);

    const usernames = new Set<string>();
    let idleRounds = 0;
    let previousCount = 0;

    while (idleRounds < maxIdleRounds) {
      const batch = await this.collectUsernamesInDialog(dialog);
      for (const name of batch) {
        if (exclude && name.toLowerCase() === exclude) continue;
        usernames.add(name);
      }

      console.log(
        `  ...collected ${usernames.size} usernames so far` +
          (expected ? ` (target ~${expected})` : ''),
      );

      if (expected && usernames.size >= expected - 1) {
        break;
      }

      if (usernames.size === previousCount) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
        previousCount = usernames.size;
      }

      await this.scrollDialogList(dialog);
      await this.page.waitForTimeout(settleMs);
    }

    return [...usernames].sort((a, b) => a.localeCompare(b));
  }

  private async scrollDialogList(dialog: Locator): Promise<void> {
    await dialog.evaluate((root) => {
      const candidates = Array.from(root.querySelectorAll('div')).filter((el) => {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        return (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 20
        );
      });

      const target =
        candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] ?? root;
      target.scrollTop = target.scrollHeight;
    });
  }

  private async collectUsernamesInDialog(dialog: Locator): Promise<string[]> {
    return dialog.evaluate((root) => {
      const ignored = new Set([
        'accounts',
        'explore',
        'direct',
        'reels',
        'stories',
        'p',
        'reel',
        'tv',
        'tags',
        'locations',
      ]);

      const names = new Set<string>();
      const links = root.querySelectorAll('a[href^="/"]');

      for (const link of Array.from(links)) {
        const href = link.getAttribute('href') ?? '';
        const match = href.match(/^\/([A-Za-z0-9._]+)\/?$/);
        if (!match) continue;

        const username = match[1];
        if (ignored.has(username.toLowerCase())) continue;
        names.add(username);
      }

      return Array.from(names);
    });
  }

  /**
   * Opens a profile and unfollows if currently following.
   * Returns status for reporting.
   */
  async unfollowUser(
    targetUsername: string,
  ): Promise<'unfollowed' | 'already_not_following' | 'not_found' | 'failed'> {
    const handle = targetUsername.replace(/^@/, '').trim();

    try {
      await this.page.goto(`/${handle}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await this.page.waitForTimeout(1_500);
      await this.dismissPostLoginPrompts();

      // Unavailable / deleted accounts
      const unavailable = this.page.getByText(/sorry, this page isn't available|user not found/i);
      if (await unavailable.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
        return 'not_found';
      }

      const followingButton = this.page
        .getByRole('button', { name: /^(following|requested)$/i })
        .or(this.page.locator('button:has-text("Following"), button:has-text("Requested")'))
        .first();

      const followButton = this.page.getByRole('button', { name: /^follow( back)?$/i }).first();

      const isFollowing = await followingButton.isVisible({ timeout: 4_000 }).catch(() => false);
      if (!isFollowing) {
        const showsFollow = await followButton.isVisible({ timeout: 2_000 }).catch(() => false);
        return showsFollow ? 'already_not_following' : 'failed';
      }

      await followingButton.click();
      await this.page.waitForTimeout(600);

      const unfollowConfirm = this.page
        .getByRole('button', { name: /^unfollow$/i })
        .or(this.dialog().getByText(/^unfollow$/i))
        .first();

      if (await unfollowConfirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await unfollowConfirm.click();
      } else {
        // Some layouts use a menu item / clickable row instead of a button
        const unfollowRow = this.page.locator('[role="dialog"] >> text=/^Unfollow$/i').first();
        if (await unfollowRow.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await unfollowRow.click();
        } else {
          return 'failed';
        }
      }

      // Success when Follow reappears (or Following disappears)
      const confirmed =
        (await followButton.isVisible({ timeout: 8_000 }).catch(() => false)) ||
        !(await followingButton.isVisible({ timeout: 2_000 }).catch(() => false));

      return confirmed ? 'unfollowed' : 'failed';
    } catch {
      return 'failed';
    }
  }
}
