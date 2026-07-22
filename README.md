# Instagram Follow Comparison (Playwright + TypeScript)

Logs into Instagram, opens your profile, extracts **followers** and **following**, then reports accounts you follow who do **not** follow you back.

## Setup

```bash
npm install
npx playwright install chromium
```

Credentials live in `.env` (gitignored):

```
IG_USERNAME=paolomondelo@yahoo.com
IG_PASSWORD=your-password
IG_PROFILE=paolomondelo
```

## Run

```bash
npm run test:headed
```

The browser stays visible (recommended for Instagram). The run can take several minutes while lists scroll and load.

## Report

After a successful run you get:

| File | Contents |
|------|----------|
| `reports/follow-comparison-latest.html` | Visual report (open in browser) |
| `reports/follow-comparison-latest.json` | Same data as JSON |
| Console output | Counts + usernames who don't follow back |

Open the latest report:

```bash
npm run open:follow-report
```

The HTML highlights:

1. **Not following back** — you follow them, they do not follow you
2. Mutual follows
3. Followers you do not follow
4. Full followers / following lists

## Notes

- Instagram may show cookie consent, “Save login info”, or notification prompts — the script dismisses these when present.
- CAPTCHA, 2FA, or suspicious-login challenges must be completed manually in headed mode.
- Large lists take longer because Instagram lazy-loads as the dialog scrolls.
- Never commit `.env`.
