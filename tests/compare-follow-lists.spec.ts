import { test, expect } from '@playwright/test';
import { compareFollowLists } from '../utils/compareFollowLists';
import { writeFollowReport } from '../utils/writeFollowReport';
import * as fs from 'fs';

test('compareFollowLists finds who does not follow back', async () => {
  const comparison = compareFollowLists(
    'your-email',
    ['alice', 'bob', 'carol'],
    ['bob', 'dave', 'erin'],
    { profileFollowersCount: 3, profileFollowingCount: 3 },
  );

  expect(comparison.notFollowingBack).toEqual(['dave', 'erin']);
  expect(comparison.mutual).toEqual(['bob']);
  expect(comparison.followersNotFollowed).toEqual(['alice', 'carol']);
  expect(comparison.countGap).toBe(0);
  expect(comparison.explanation).toContain('do not follow you back');
  expect(comparison.profileFollowersCount).toBe(3);
  expect(comparison.profileFollowingCount).toBe(3);

  const { htmlPath, jsonPath } = writeFollowReport(comparison);
  expect(fs.existsSync(htmlPath)).toBeTruthy();
  expect(fs.existsSync(jsonPath)).toBeTruthy();
  expect(fs.existsSync('reports/follow-comparison-latest.html')).toBeTruthy();
});
