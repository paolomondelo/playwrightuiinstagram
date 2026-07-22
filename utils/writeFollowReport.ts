import * as fs from 'fs';
import * as path from 'path';
import type { FollowComparison } from './compareFollowLists';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function listItems(usernames: string[]): string {
  if (usernames.length === 0) {
    return '<li class="empty">None</li>';
  }

  return usernames
    .map(
      (name) =>
        `<li><a href="https://www.instagram.com/${escapeHtml(name)}/" target="_blank" rel="noopener noreferrer">@${escapeHtml(name)}</a></li>`,
    )
    .join('\n');
}

export function writeFollowReport(
  comparison: FollowComparison,
  outputDir = path.join(process.cwd(), 'reports'),
): { htmlPath: string; jsonPath: string } {
  fs.mkdirSync(outputDir, { recursive: true });

  const stamp = comparison.generatedAt.replace(/[:.]/g, '-');
  const htmlPath = path.join(outputDir, `follow-comparison-${stamp}.html`);
  const jsonPath = path.join(outputDir, `follow-comparison-${stamp}.json`);
  const latestHtml = path.join(outputDir, 'follow-comparison-latest.html');
  const latestJson = path.join(outputDir, 'follow-comparison-latest.json');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Instagram Follow Comparison — @${escapeHtml(comparison.profile)}</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9bb4;
      --accent: #e1306c;
      --ok: #2dd4a8;
      --warn: #f5a524;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: radial-gradient(ellipse at top, #1c2838 0%, var(--bg) 55%);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1.25rem 3rem;
    }
    main { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.75rem; margin: 0 0 0.35rem; }
    .sub { color: var(--muted); margin-bottom: 1.75rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }
    .stat {
      background: var(--panel);
      border: 1px solid #2a3a52;
      border-radius: 12px;
      padding: 1rem;
    }
    .stat .label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat .value { font-size: 1.6rem; font-weight: 700; margin-top: 0.25rem; }
    .stat.highlight .value { color: var(--warn); }
    .stat.ok .value { color: var(--ok); }
    section {
      background: var(--panel);
      border: 1px solid #2a3a52;
      border-radius: 14px;
      padding: 1.25rem 1.35rem;
      margin-bottom: 1.25rem;
    }
    section h2 {
      margin: 0 0 0.75rem;
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    section h2 .count {
      background: #243247;
      color: var(--muted);
      font-size: 0.8rem;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.4rem 0.75rem;
      max-height: 420px;
      overflow: auto;
    }
    li a {
      color: #7dd3fc;
      text-decoration: none;
      font-size: 0.95rem;
    }
    li a:hover { text-decoration: underline; color: #bae6fd; }
    li.empty { color: var(--muted); grid-column: 1 / -1; }
    .focus { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(225, 48, 108, 0.35); }
  </style>
</head>
<body>
  <main>
    <h1>Instagram Follow Comparison</h1>
    <p class="sub">Profile: <strong>@${escapeHtml(comparison.profile)}</strong> · Generated ${escapeHtml(comparison.generatedAt)}</p>
    <p class="sub">${escapeHtml(comparison.explanation)}</p>

    <div class="stats">
      <div class="stat"><div class="label">Followers (profile)</div><div class="value">${comparison.profileFollowersCount ?? '—'}</div></div>
      <div class="stat"><div class="label">Following (profile)</div><div class="value">${comparison.profileFollowingCount ?? '—'}</div></div>
      <div class="stat"><div class="label">Followers (list)</div><div class="value">${comparison.followers.length}</div></div>
      <div class="stat"><div class="label">Following (list)</div><div class="value">${comparison.following.length}</div></div>
      <div class="stat highlight"><div class="label">Not following back</div><div class="value">${comparison.notFollowingBack.length}</div></div>
      <div class="stat ok"><div class="label">Mutual</div><div class="value">${comparison.mutual.length}</div></div>
      <div class="stat"><div class="label">Count gap</div><div class="value">${comparison.countGap}</div></div>
    </div>

    <section class="focus">
      <h2>In following, not in followers <span class="count">${comparison.notFollowingBack.length}</span></h2>
      <p class="sub" style="margin-top:0">These accounts are why following is higher than followers.</p>
      <ul>
        ${listItems(comparison.notFollowingBack)}
      </ul>
    </section>

    <section>
      <h2>Mutual follows <span class="count">${comparison.mutual.length}</span></h2>
      <ul>
        ${listItems(comparison.mutual)}
      </ul>
    </section>

    <section>
      <h2>They follow you — you do not follow them <span class="count">${comparison.followersNotFollowed.length}</span></h2>
      <ul>
        ${listItems(comparison.followersNotFollowed)}
      </ul>
    </section>

    <section>
      <h2>All followers <span class="count">${comparison.followers.length}</span></h2>
      <ul>
        ${listItems(comparison.followers)}
      </ul>
    </section>

    <section>
      <h2>All following <span class="count">${comparison.following.length}</span></h2>
      <ul>
        ${listItems(comparison.following)}
      </ul>
    </section>
  </main>
</body>
</html>
`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(comparison, null, 2), 'utf8');
  fs.writeFileSync(latestHtml, html, 'utf8');
  fs.writeFileSync(latestJson, JSON.stringify(comparison, null, 2), 'utf8');

  return { htmlPath, jsonPath };
}
