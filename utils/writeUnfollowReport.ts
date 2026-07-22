import * as fs from 'fs';
import * as path from 'path';

export type UnfollowStatus =
  | 'unfollowed'
  | 'already_not_following'
  | 'not_found'
  | 'failed';

export interface UnfollowResult {
  username: string;
  status: UnfollowStatus;
}

export interface UnfollowReport {
  profile: string;
  generatedAt: string;
  results: UnfollowResult[];
  summary: Record<UnfollowStatus, number>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function writeUnfollowReport(
  profile: string,
  results: UnfollowResult[],
  outputDir = path.join(process.cwd(), 'reports'),
): { htmlPath: string; jsonPath: string } {
  fs.mkdirSync(outputDir, { recursive: true });

  const summary: Record<UnfollowStatus, number> = {
    unfollowed: 0,
    already_not_following: 0,
    not_found: 0,
    failed: 0,
  };
  for (const row of results) summary[row.status] += 1;

  const report: UnfollowReport = {
    profile,
    generatedAt: new Date().toISOString(),
    results,
    summary,
  };

  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const htmlPath = path.join(outputDir, `unfollow-results-${stamp}.html`);
  const jsonPath = path.join(outputDir, `unfollow-results-${stamp}.json`);
  const latestHtml = path.join(outputDir, 'unfollow-results-latest.html');
  const latestJson = path.join(outputDir, 'unfollow-results-latest.json');

  const rows = results
    .map(
      (r) =>
        `<tr class="${escapeHtml(r.status)}"><td><a href="https://www.instagram.com/${escapeHtml(r.username)}/" target="_blank" rel="noopener">@${escapeHtml(r.username)}</a></td><td>${escapeHtml(r.status)}</td></tr>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Instagram Unfollow Results — @${escapeHtml(profile)}</title>
  <style>
    :root { --bg:#0f1419; --panel:#1a2332; --text:#e7ecf3; --muted:#8b9bb4; --ok:#2dd4a8; --warn:#f5a524; --bad:#f87171; }
    body { margin:0; font-family:"Segoe UI",Tahoma,sans-serif; background:radial-gradient(ellipse at top,#1c2838 0%,var(--bg) 55%); color:var(--text); padding:2rem 1.25rem 3rem; }
    main { max-width:900px; margin:0 auto; }
    h1 { margin:0 0 .35rem; font-size:1.6rem; }
    .sub { color:var(--muted); margin-bottom:1.5rem; }
    .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.75rem; margin-bottom:1.5rem; }
    .stat { background:var(--panel); border:1px solid #2a3a52; border-radius:12px; padding:1rem; }
    .stat .label { color:var(--muted); font-size:.8rem; text-transform:uppercase; }
    .stat .value { font-size:1.5rem; font-weight:700; margin-top:.2rem; }
    table { width:100%; border-collapse:collapse; background:var(--panel); border-radius:12px; overflow:hidden; }
    th, td { text-align:left; padding:.65rem .9rem; border-bottom:1px solid #2a3a52; }
    th { color:var(--muted); font-size:.8rem; text-transform:uppercase; }
    a { color:#7dd3fc; text-decoration:none; }
    tr.unfollowed td:last-child { color:var(--ok); }
    tr.already_not_following td:last-child { color:var(--muted); }
    tr.not_found td:last-child { color:var(--warn); }
    tr.failed td:last-child { color:var(--bad); }
  </style>
</head>
<body>
  <main>
    <h1>Unfollow Results</h1>
    <p class="sub">Profile: <strong>@${escapeHtml(profile)}</strong> · ${escapeHtml(report.generatedAt)} · ${results.length} accounts</p>
    <div class="stats">
      <div class="stat"><div class="label">Unfollowed</div><div class="value">${summary.unfollowed}</div></div>
      <div class="stat"><div class="label">Already not following</div><div class="value">${summary.already_not_following}</div></div>
      <div class="stat"><div class="label">Not found</div><div class="value">${summary.not_found}</div></div>
      <div class="stat"><div class="label">Failed</div><div class="value">${summary.failed}</div></div>
    </div>
    <table>
      <thead><tr><th>Account</th><th>Status</th></tr></thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </main>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(latestHtml, html, 'utf8');
  fs.writeFileSync(latestJson, JSON.stringify(report, null, 2), 'utf8');

  return { htmlPath, jsonPath };
}
