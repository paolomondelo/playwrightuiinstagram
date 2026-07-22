import { test, expect } from '@playwright/test';
import { InstagramPage } from '../pages/InstagramPage';
import { ACCOUNTS_NOT_FOLLOWING_BACK } from '../data/accounts-not-following-back';
import { writeUnfollowReport, UnfollowResult } from '../utils/writeUnfollowReport';

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;
const profile = process.env.IG_PROFILE ?? 'paolomondelo';

/** Pause between unfollows to reduce Instagram action-block risk. */
const DELAY_BETWEEN_MS = Number(process.env.IG_UNFOLLOW_DELAY_MS ?? 2_500);

test.describe('Instagram unfollow — in following, not in followers', () => {
  test.beforeEach(() => {
    test.skip(!username || !password, 'Set IG_USERNAME and IG_PASSWORD in .env before running');
  });

  test('unfollow accounts that are followed but do not follow back', async ({ page }) => {
    // ~395 accounts × ~5–8s each — allow up to 90 minutes
    test.setTimeout(90 * 60_000);

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const instagram = new InstagramPage(page);
    const results: UnfollowResult[] = [];

    console.log(`Logging in as: ${username}`);
    await instagram.gotoLogin();
    await instagram.login(username!, password!);
    await instagram.dismissPostLoginPrompts();
    await instagram.expectLoggedIn();

    console.log(`\nUnfollowing ${ACCOUNTS_NOT_FOLLOWING_BACK.length} accounts...\n`);

    for (let i = 0; i < ACCOUNTS_NOT_FOLLOWING_BACK.length; i++) {
      const handle = ACCOUNTS_NOT_FOLLOWING_BACK[i];
      const progress = `[${i + 1}/${ACCOUNTS_NOT_FOLLOWING_BACK.length}]`;

      const status = await instagram.unfollowUser(handle);
      results.push({ username: handle, status });
      console.log(`${progress} @${handle} → ${status}`);

      if (i < ACCOUNTS_NOT_FOLLOWING_BACK.length - 1) {
        await page.waitForTimeout(DELAY_BETWEEN_MS);
      }
    }

    const { htmlPath, jsonPath } = writeUnfollowReport(profile, results);
    const unfollowed = results.filter((r) => r.status === 'unfollowed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'already_not_following').length;
    const missing = results.filter((r) => r.status === 'not_found').length;

    console.log('\n========== UNFOLLOW REPORT ==========');
    console.log(`Total:                  ${results.length}`);
    console.log(`Unfollowed:             ${unfollowed}`);
    console.log(`Already not following:  ${skipped}`);
    console.log(`Not found:              ${missing}`);
    console.log(`Failed:                 ${failed}`);
    console.log(`HTML report: ${htmlPath}`);
    console.log(`JSON report: ${jsonPath}`);
    console.log('=====================================\n');

    expect(results.length).toBe(ACCOUNTS_NOT_FOLLOWING_BACK.length);
    // Pass even if some fail — report captures details. Fail only if nothing succeeded and many failed.
    expect(
      unfollowed + skipped,
      'Expected at least some accounts to be unfollowed or already not followed',
    ).toBeGreaterThan(0);
  });
});
