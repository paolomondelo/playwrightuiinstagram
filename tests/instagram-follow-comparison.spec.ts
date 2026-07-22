import { test, expect } from '@playwright/test';
import { InstagramPage } from '../pages/InstagramPage';
import { compareFollowLists } from '../utils/compareFollowLists';
import { writeFollowReport } from '../utils/writeFollowReport';

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;
const profile = process.env.IG_PROFILE ?? 'your-email';

test.describe('Instagram follow comparison', () => {
  test.beforeEach(() => {
    test.skip(!username || !password, 'Set IG_USERNAME and IG_PASSWORD in .env before running');
  });

  test('explain followers vs following gap and list following not in followers', async ({
    page,
  }) => {
    test.setTimeout(20 * 60_000);

    // Reduce obvious automation signals before Instagram loads
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const instagram = new InstagramPage(page);

    console.log(`Logging in as: ${username}`);
    console.log('Step: open login page...');
    await instagram.gotoLogin();
    console.log(`Step: on URL ${page.url()}`);
    console.log('Step: fill credentials...');
    await instagram.login(username!, password!);
    console.log(`Step: after login URL ${page.url()}`);
    await instagram.dismissPostLoginPrompts();
    console.log('Step: verify logged in...');
    await instagram.expectLoggedIn();

    console.log(`Step: open profile /${profile}/ ...`);
    await instagram.openProfile(profile);
    console.log(`Step: on profile URL ${page.url()}`);

    const profileFollowersCount = await instagram.getCountFromProfileLink('followers');
    const profileFollowingCount = await instagram.getCountFromProfileLink('following');
    console.log(
      `Step: profile header counts — followers=${profileFollowersCount}, following=${profileFollowingCount}`,
    );
    expect(profileFollowersCount, 'Profile followers count should be visible').toBeGreaterThan(0);
    expect(profileFollowingCount, 'Profile following count should be visible').toBeGreaterThan(0);

    console.log('Step: extract followers...');
    await instagram.openFollowersDialog(profile);
    const followers = await instagram.extractUsernamesFromDialog({
      excludeUsername: profile,
      expectedCount: profileFollowersCount,
    });
    await instagram.closeDialog();
    console.log(`Followers found: ${followers.length}`);
    expect(followers.length, 'Expected at least one follower').toBeGreaterThan(0);

    console.log('Step: extract following...');
    await instagram.openFollowingDialog(profile);
    const following = await instagram.extractUsernamesFromDialog({
      excludeUsername: profile,
      expectedCount: profileFollowingCount,
      maxIdleRounds: 15,
      settleMs: 1_200,
    });
    await instagram.closeDialog();
    console.log(`Following found: ${following.length}`);
    expect(following.length, 'Expected at least one following').toBeGreaterThan(0);

    const comparison = compareFollowLists(profile, followers, following, {
      profileFollowersCount,
      profileFollowingCount,
    });
    const { htmlPath, jsonPath } = writeFollowReport(comparison);

    console.log('\n========== WHY FOLLOWERS ≠ FOLLOWING ==========');
    console.log(`Profile:              @${profile}`);
    console.log(`Followers (profile):  ${profileFollowersCount}`);
    console.log(`Following (profile):  ${profileFollowingCount}`);
    console.log(`Followers (extracted): ${followers.length}`);
    console.log(`Following (extracted): ${following.length}`);
    console.log(`Count gap (following − followers): ${comparison.countGap}`);
    console.log(`Mutual follows:       ${comparison.mutual.length}`);
    console.log(`\n${comparison.explanation}`);
    console.log('\n--- In FOLLOWING but NOT in FOLLOWERS ---');
    for (const name of comparison.notFollowingBack) {
      console.log(`  @${name}`);
    }
    console.log(`\nTotal not following back: ${comparison.notFollowingBack.length}`);
    console.log(`HTML report: ${htmlPath}`);
    console.log(`JSON report: ${jsonPath}`);
    console.log(`Latest HTML: reports/follow-comparison-latest.html`);
    console.log('================================================\n');

    expect(comparison.notFollowingBack, 'List of non-reciprocal follows should be defined').toBeDefined();

    // When following > followers on the profile, expect at least some non-reciprocal accounts
    if (
      profileFollowingCount != null &&
      profileFollowersCount != null &&
      profileFollowingCount > profileFollowersCount
    ) {
      expect(
        comparison.notFollowingBack.length,
        'Following exceeds followers, so some accounts should not follow back',
      ).toBeGreaterThan(0);
    }
  });
});
