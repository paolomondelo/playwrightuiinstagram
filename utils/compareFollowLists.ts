export interface FollowComparison {
  profile: string;
  /** Counts shown on the Instagram profile header (e.g. 673 followers, 922 following). */
  profileFollowersCount: number | null;
  profileFollowingCount: number | null;
  followers: string[];
  following: string[];
  /** In following, but not in followers — explains most of following > followers. */
  notFollowingBack: string[];
  /** In followers, but not in following. */
  followersNotFollowed: string[];
  mutual: string[];
  /** following.length - followers.length from extracted lists. */
  countGap: number;
  explanation: string;
  generatedAt: string;
}

export function compareFollowLists(
  profile: string,
  followers: string[],
  following: string[],
  options?: {
    profileFollowersCount?: number | null;
    profileFollowingCount?: number | null;
  },
): FollowComparison {
  const followerSet = new Set(followers.map((u) => u.toLowerCase()));
  const followingSet = new Set(following.map((u) => u.toLowerCase()));

  const notFollowingBack = following
    .filter((u) => !followerSet.has(u.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const followersNotFollowed = followers
    .filter((u) => !followingSet.has(u.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const mutual = following
    .filter((u) => followerSet.has(u.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const countGap = following.length - followers.length;
  const profileFollowersCount = options?.profileFollowersCount ?? null;
  const profileFollowingCount = options?.profileFollowingCount ?? null;

  const explanation =
    countGap === 0 && notFollowingBack.length === 0 && followersNotFollowed.length === 0
      ? 'Followers and following lists match (all mutual).'
      : [
          `Profile shows ${profileFollowersCount ?? followers.length} followers vs ${profileFollowingCount ?? following.length} following.`,
          `You follow ${notFollowingBack.length} account(s) that do not follow you back — that is the main reason the counts differ.`,
          followersNotFollowed.length > 0
            ? `${followersNotFollowed.length} follower(s) are not in your following list.`
            : null,
          `${mutual.length} mutual follow(s). Extracted list gap (following − followers) = ${countGap}.`,
        ]
          .filter(Boolean)
          .join(' ');

  return {
    profile,
    profileFollowersCount,
    profileFollowingCount,
    followers,
    following,
    notFollowingBack,
    followersNotFollowed,
    mutual,
    countGap,
    explanation,
    generatedAt: new Date().toISOString(),
  };
}
