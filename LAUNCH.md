# Launch runbook: domain, hosting and analytics

End state: the site lives at `https://abcforslps.com`, hosted free on Cloudflare Workers as
static assets, rebuilt automatically on every push to `main`. Traffic numbers come from Cloudflare Web Analytics
and heatmaps and session recordings from Microsoft Clarity. Total ongoing cost is the
domain, about $10 to $11 a year. Everything else is free with no trial period.

The domain is `abcforslps.com`, registered at Cloudflare on 2026-09-25.

**Do the parts in order.** Part 3 deploys the site and gives you a working URL to test
before any DNS exists, so if something is broken you find out while the domain is still
unpointed and nobody is looking.

---

## Part 1: Cloudflare account

1. Go to <https://dash.cloudflare.com/sign-up>, enter an email and password, verify the
   email.

   **Prefer email and password over the GitHub, Google or Apple buttons.** Signing up
   through social login creates an account with no password at all, and Cloudflare's 2FA
   setup in step 2 then demands a password that does not exist and rejects everything you
   type. See the workaround below if this already happened.

2. Turn on two-factor authentication immediately: **My Profile → Authentication →
   Two-Factor Authentication → Mobile App Authentication → Add**. This account will hold
   the domain registration, the DNS and the hosting, so losing it loses all three at once.

   Choose Mobile App (TOTP), not Email Authentication: a code sent to the same inbox that
   can reset the password is not really a second factor. A hardware security key is
   stronger still, but Cloudflare wants TOTP enabled first.

3. Generate the backup codes. They are a **separate step**, not part of the 2FA flow:
   the same Authentication page has a **Backup codes → Generate** card lower down, and it
   still reads `Generate` after two-factor goes active. Save them somewhere real, not in a
   browser tab, and not only on the phone running the authenticator, since that is the thing
   most likely to be lost or replaced. They can be regenerated later if missed.

No plan selection or card is needed yet. The free tier covers everything here.

### If you signed up with GitHub, Google or Apple

The 2FA screen asks for a password the account never had, and reports `Invalid password
entered` no matter what you enter. This is a known Cloudflare gap, tracked at
<https://github.com/cloudflare/cloudflare-docs/issues/25440>.

**The simplest fix is to not keep the account.** If nothing has been bought or deployed yet,
log out, sign up again at <https://dash.cloudflare.com/sign-up> with email and password, and
2FA then works first time. If the email is reported as taken, a Gmail alias such as
`you+cf@gmail.com` delivers to the same inbox and registers as distinct.

To keep the existing account instead, the documented route is the password reset flow
(<https://developers.cloudflare.com/fundamentals/user-profiles/login/>):

1. While still logged in, check the account's email at <https://dash.cloudflare.com/profile>.
   If GitHub supplied a private `users.noreply.github.com` address, no reset mail can ever
   arrive. Change it to a real address first.
2. **Log out, or open a private window.** This step is the one that traps people:
   `/forgot-password` redirects a logged-in session back to the dashboard, so the page looks
   broken or unclickable. The widely reported "switching browsers fixed it" is just this.
3. Go to <https://dash.cloudflare.com/forgot-password>, enter the account email, click Send,
   and follow the emailed link to set a password.
4. Restart the 2FA flow. It generates a **new** QR code, so delete the stale entry in your
   authenticator app first and scan the new one, or the codes will not match and it looks
   like a second failure.

Do not bother with **My Profile → Authentication → Password**. That tab asks for an old
password the account never had, which is the second half of the same bug.

Also note that social login leaves a second front door this account's own 2FA does not
cover: whoever controls the linked GitHub, Google or Apple account controls this Cloudflare
account and therefore the domains. Confirm two-factor is on there too.

---

## Part 2: Buy the domain

1. In the dashboard sidebar: **Domain Registration → Register Domains**.
2. Search your name. Cloudflare shows the true renewal price, not a discounted first year,
   so the number you see is the number you pay every year.
3. Prefer `.com`. A `.org` reads fine for an education tool. Avoid `.xyz`, `.site`, `.online`
   and similar: cheap for a year, then $15 to $30, and they read as less trustworthy for a
   clinical tool.
4. Add to cart, enter registrant contact details, pay by card or PayPal.
5. Confirm two settings on the domain's page afterwards:
   - **Auto-renew: on.** A lapsed domain takes the site down.
   - **WHOIS privacy: on.** Free and on by default at Cloudflare, but verify it, or the
     registrant name, address, phone and email are public.

**Why register here rather than Porkbun or Namecheap:** buying at Cloudflare puts the
domain on Cloudflare DNS at the moment of purchase. There is no nameserver change and no
propagation wait, so Part 4 becomes a single click instead of copying four A records and
waiting a day. If you buy the domain elsewhere, Part 4 gets longer and needs the nameserver
change first.

**Who should register it.** The site credits Maggie Van Camp. If the domain should be hers,
she creates her own Cloudflare account and registers it there, and she owns the renewal and
the payment method. The GitHub repository can stay on your account either way, and you can
still deploy: Part 4 is a single click only when the domain and the Pages project sit in the
same Cloudflare account, so if she registers it, build the Pages project in her account too,
with your GitHub connected to it. Decide this before buying, because moving a domain between
Cloudflare accounts afterwards is a manual transfer.

---

## Part 3: Deploy to Cloudflare Workers (static assets)

Do this before pointing the domain.

**Cloudflare Pages is retired for new projects.** As of September 2026 the dashboard routes
every new site through Workers Static Assets, and a deep link to the old Pages creation flow
(`/:account/pages/new`) redirects to `/workers-and-pages/create`. A "need to use legacy
Pages?" link may still appear. Do not take it: Pages is in maintenance mode, so anything
built there has to be migrated later anyway.

The Workers path serves this site identically and still costs nothing. Requests to static
assets are free and unlimited, so the `100,000 requests/day` meter on the Workers & Pages
page does not apply here. That meter counts Worker script invocations, and this site has no
Worker script.

**The config files are already in the repo.** `wrangler.jsonc` declares the site as static
assets, and omitting `main` is what tells Cloudflare there is no server code:

```jsonc
{
  "name": "slp-word-bank",
  "compatibility_date": "2026-09-26",
  "workers_dev": false,
  "preview_urls": false,
  "assets": { "directory": "." }
}
```

`workers_dev` and `preview_urls` are set to `false` so `abcforslps.com` is the only public
address. **These must live in the config, not the dashboard toggle.** `wrangler deploy`
re-enables both on every deploy when they are absent, and says so in the build log: *"Because
'workers_dev' is not in your Wrangler file, it will be enabled for this deployment by
default."* Switching the toggle off in the dashboard lasts until the next push.

`.assetsignore` sits beside it, in gitignore syntax, and lists everything that must **not**
be published. `"directory": "."` means the assets directory is the repo root, so anything not
listed here is uploaded and served.

**`.git/` must be the first line.** Omitting it publishes the entire repository: the first
deploy of this site served `/.git/config` and `/.git/HEAD` with HTTP 200, and the build log
gave it away by reporting 59 uploaded assets for a site with about a dozen files. This repo
is public so nothing was disclosed, but on a private repo the same omission would publish
every commit. Watch that asset count on future deploys.

Never add `data/` to it: those two files are the site's content.

Both must be committed and pushed **before** the deploy runs, or the build has nothing to act
on.

1. Dashboard sidebar: **Compute → Workers & Pages → Create application**.
2. Choose the Git option and authorize Cloudflare's GitHub app. When GitHub asks for
   repository access, **Only select repositories** with just `mvc-slp-wordbank` is enough.
   It does not need the whole account.
3. Select `JoeStorto/mvc-slp-wordbank`.
4. On "Set up your application":

   | Field | Value |
   |---|---|
   | Project name | `slp-word-bank` |
   | Build command | **leave completely empty** |
   | Deploy command | `npx wrangler deploy` |

   The repo has no `package.json` and nothing to compile, so any build command makes the
   deploy fail. `npx` fetches wrangler on demand, so the absence of `package.json` is fine.
   If the build log reports wrangler cannot be found, adding a minimal `package.json` with
   wrangler as a devDependency is the fallback.

5. **Deploy.** First build takes well under a minute since nothing is compiled.
6. Open the `https://slp-word-bank.<subdomain>.workers.dev` URL it gives you and verify
   properly, not just that the page paints:
   - Generate a word list. If words appear, `words.txt` loaded.
   - Open DevTools → Network, reload, and confirm `real-check.txt` and `words.txt` both
     return **200**, not 404.
   - In the same Network rows, check `content-encoding: zstd` on both. Cloudflare compresses
     by **content type**, and it does not compress `text/tab-separated-values`. That is why
     the word list is `data/words.txt` and not `.tsv`: as `.tsv` it shipped at the full
     1.19MB uncompressed, and as `.txt` it is served as `text/plain` and compresses to about
     420KB. If a future data file arrives with an unusual extension, check this before
     assuming it is compressed.

     Measured, against GitHub Pages as the baseline: Cloudflare serves ~1.57MB of data files
     versus GitHub's ~1.49MB gzip, so it is marginally **larger**, because Cloudflare uses a
     fast zstd level rather than maximum compression. Payload size was not a reason to move.
     The reasons are one account holding the domain, DNS and hosting, and the free analytics
     in Part 6.

From here, every push to `main` redeploys automatically in about 30 seconds. Pushing is
still your action; nothing in this setup pushes on your behalf.

`.nojekyll` is a GitHub Pages file. Cloudflare ignores it. Leave it in the repo so the
GitHub Pages fallback in Part 5 keeps working.

---

## Part 4: Point the domain at the site

1. **Workers & Pages → slp-word-bank → Domains → Add Domain.**
2. In the "Connect to abcforslps.com" dialog:
   - **Subdomain: leave empty.** Empty means the root domain.
   - **Enable for: Production.** Not "Production and Preview". Preview is the per-branch
     environment Cloudflare builds for pull requests, and the real domain must never serve a
     preview build.
3. Because the domain is registered in this same Cloudflare account, Cloudflare creates the
   DNS record itself and issues the TLS certificate. No records to copy. Usually live in
   under a minute, occasionally a few more for the certificate.
4. **Add Domain a second time**, this time with `www` in the Subdomain field, Production
   again. Without it, anyone who types `www.` out of habit gets a certificate error rather
   than the site.
5. Both rows should then show Type `Production`, Zone `abcforslps.com`.

Both spellings now serve the site, and the `workers.dev` URL still does too. Three public
addresses for one site splits analytics and gives search engines duplicate content, so the
Part 7 checklist turns the `workers.dev` route off once the domain is confirmed. Leave it on
until then: it is the only way to test if something goes wrong with the domain.

Optional, and only if you care which spelling is canonical: **Rules → Redirect Rules**, one
rule forwarding `www.abcforslps.com` to `abcforslps.com` with a 301. For a site like this it makes
no practical difference, and a `<link rel="canonical">` tag in `index.html` does the same job
for search engines with less moving machinery.

---

## Part 5: Redirect the old github.io link

Once the domain is live, `https://joestorto.github.io/mvc-slp-wordbank/` still serves a
second, identical copy of the site. That splits analytics, gives search engines duplicate
content, and leaves everyone who already has that link unaware the real address exists.
Turning GitHub Pages off instead is worse: they get a 404 with no way to find the site.

**The fix is `docs/`, already in the repo.** GitHub Pages can publish from a `/docs` folder
on `main` instead of the repo root. `docs/index.html` and an identical `docs/404.html`
redirect to `https://abcforslps.com/` via three mechanisms together: a `<link rel="canonical">`
for search engines, a `<meta http-equiv="refresh">` for browsers without JavaScript, and
`location.replace()` for everyone else, which redirects without leaving a history entry that
the back button would bounce off.

1. Commit and push `docs/`.
2. Repo **Settings → Pages → Source: Deploy from a branch → Branch `main`, Folder `/docs`**,
   then Save.
3. Within a minute, the old URL serves the redirect instead of the site.

`docs/` is listed in `.assetsignore`, so Cloudflare never uploads it and `abcforslps.com/docs/`
stays a 404. GitHub serves `404.html` for any unmatched path under the project path, so deep
links redirect too.

**Why not a `/docs` folder on a separate branch,** which is the other common approach: this
way is one commit on `main` with no branch switching, and `main` root stops being published
by GitHub the moment the source changes to `/docs`, which is what removes the duplicate.

A meta refresh is not a true 301, so it is marginally weaker for search engines, but with the
canonical tag present that is irrelevant at this scale.

**Do not rename the repository** after this. The redirect is per-path, and renaming breaks the
old URL exactly the way it broke when `slp-word-bank` became `mvc-slp-wordbank`. For the same
reason the repo must stay **public**: GitHub Pages does not serve private repositories on the
Free plan, so making it private would take the redirect down with it.

---

## Part 6: Analytics

Two tools, because they answer different questions, and both are free with no cap.

### Cloudflare Web Analytics: traffic numbers, no cookies

1. In the Pages project: **Settings**, find **Web Analytics**, click **Enable**.
2. That is the whole setup. Cloudflare injects the beacon at the edge, so there is no script
   tag to add and nothing to commit.

If the toggle is not there, add it manually instead: **Analytics & Logs → Web Analytics → Add
a site**, enter `abcforslps.com`, copy the beacon snippet and paste it before `</head>` in
`index.html`.

This sets no cookies, needs no consent banner, and includes Core Web Vitals, so you can see
whether the 5.4MB of data files is actually hurting load times on phones.

### Microsoft Clarity: heatmaps, click maps, session recordings

1. Go to <https://clarity.microsoft.com> and sign in with a Microsoft, Google or Facebook
   account.
2. **New project.** Name: `SLP Word Bank`. Website URL: `abcforslps.com`. Category: Education.
3. **Setup → Install tracking code manually** and copy the snippet.
4. Paste it immediately before `</head>` in `index.html`, then commit and push. Cloudflare
   Pages redeploys in about 30 seconds.
5. In Clarity **Settings**, decide on cookies. Clarity sets them by default. If EU visitors
   matter, enable its cookie-consent option, otherwise leave it.
6. Verify: load the site, then check Clarity in two to five minutes for the session
   recording. Heatmaps need a handful of visits before they render anything useful.

Content masking can stay on its default. This site has no free-text inputs at all, only
number fields and checkboxes, so no client name or note can ever reach a recording. That is
worth knowing, because session recording on a clinical tool is normally the thing you cannot
do.

### The tracking actually worth having

Heatmaps mostly confirm that people click the big generate button. The useful questions are
which of the four generators gets used, which settings get picked, and how many visitors
leave before the data files finish loading.

`analytics.js` answers those. It is a standalone file loaded last, after the four app
scripts, and it touches none of them: it attaches listeners from the outside, so removing the
`<script>` tag removes the tracking completely. Every call is guarded by a
`typeof window.clarity === "function"` check, so the site behaves identically if Clarity is
blocked, fails to load, or is removed.

**Clarity project ID:** `yog1frx743`, tag in the `<head>` of `index.html`.

Events:

| Event | Fires when |
|---|---|
| `generate_words` / `generate_pairs` / `generate_ret` / `generate_spt` | each tool is run |
| `tab_words` / `tab_pairs` / `tab_ret` / `tab_spt` | a tab is opened |
| `view_cards` / `view_list` / `view_flash_cards` | the result view changes |
| `export_<tool>_<copy\|csv\|quizlet\|print>` | an export is used |
| `data_ready` | the word list finishes loading |

Dimensions set alongside them: `word_type`, `word_count`, `syllables`, `familiarity`,
`target_sound`, `sound_position`, the `pairs_*`, `ret_*` and `spt_*` equivalents, and
`load_time`.

Counts are **bucketed** (`1-10`, `11-25`, `26-50`, `51-100`, `100+`) rather than sent raw, to
keep Clarity's dimension cardinality usable. Empty fields are skipped rather than sent blank.
Keep both habits when adding events.

In Clarity these appear under **Dashboard → Custom events**, and recordings and heatmaps can
be filtered by any dimension: only sessions that used the SPT tool, only sessions on a slow
load, and so on.

---

## Part 7: Launch checklist

Run all of these once, after Part 6:

- [ ] `https://abcforslps.com` loads over HTTPS with no certificate warning
- [ ] `https://www.abcforslps.com` loads over HTTPS too
- [ ] A word list generates, so `words.txt` resolved on the real domain
- [ ] Pairs, RET and SPT tabs each produce output
- [ ] Network tab: `data/words.txt` and `data/real-check.txt` are 200 with `content-encoding: zstd`
- [ ] The site works on an actual phone, not just a narrowed desktop window
- [ ] Cloudflare Web Analytics shows at least one pageview
- [ ] Clarity shows at least one session recording
- [ ] The old github.io URL behaves the way Part 5 intended
- [ ] Domain auto-renew is on and WHOIS privacy is on

## Where to look afterwards

Four dashboards, all free, each answering something different.

### Cloudflare Web Analytics: who visits and how fast it loads

<https://dash.cloudflare.com/?to=/:account/web-analytics>, or sidebar **Analytics → Web
analytics**, then set the site filter to `abcforslps.com`.

Page views, visits, referrers, top pages, countries, browsers, and Core Web Vitals (LCP, INP,
CLS). Cookieless, so no consent banner. Default range is Last 24 hours: widen it, because at
this traffic level a day is mostly noise. `Exclude bots equals Yes` is on by default and
should stay on.

INP stays empty until real people interact; it cannot be populated by loading the page.

### Microsoft Clarity: what people actually do

<https://clarity.microsoft.com>, project **Slp site** (ID `yog1frx743`).

| Tab | What it gives |
|---|---|
| **Dashboard** | sessions, scroll depth, rage clicks, dead clicks, quick-back clicks, and **Custom events** |
| **Recordings** | individual sessions played back, filterable by any custom event or dimension |
| **Heatmaps** | click, scroll and area maps per page |
| **Settings** | cookie consent, content masking, IP blocking |

The custom events are the part worth checking: which of the four tools gets used, which
settings people choose, which exports they reach for. Filter Recordings by an event to watch
only the sessions that used, say, Sound Production Treatment.

Heatmaps need a handful of visits before they render anything meaningful, and Clarity
processes in batches, so allow a few minutes after a visit.

### Cloudflare zone analytics: traffic and security at the edge

The domain itself under **Domains → abcforslps.com → Analytics**. Requests, bandwidth, cached
versus uncached, and anything the WAF blocked. No setup, it comes with the domain being on
Cloudflare. Useful for bandwidth and bot traffic, not for understanding users.

### Worker metrics: whether the hosting is healthy

**Compute → Workers & Pages → slp-word-bank → Metrics** and **Observability**. Requests,
errors, CPU time. For a static site with no Worker script this should stay flat and boring;
it is somewhere to look if the site misbehaves, not a source of insight.

### Which to open for which question

- *Is anyone using it?* Cloudflare Web Analytics.
- *What are they doing, and which tools matter?* Clarity, Dashboard then Custom events.
- *Why did someone give up?* Clarity Recordings, filtered to sessions without a
  `generate_*` event.
- *Is it slow for real people?* Web Analytics Core Web Vitals, plus the `data_ready`
  `load_time` bands in Clarity.
- *Is the site broken?* Worker metrics.

## Rollback

Nothing here is destructive and `main` is untouched throughout. If Cloudflare Pages
misbehaves, delete the custom domain from the Pages project and re-enable GitHub Pages on
`main`: the site is back at the github.io URL within a minute. The domain and the repo are
independent, so a problem with one never takes out the other.

## Ongoing cost and maintenance

- Domain: about $10 to $11 a year, auto-renewing.
- Cloudflare Pages: free. 500 builds a month, unlimited bandwidth, no request cap.
- Cloudflare Web Analytics: free, unlimited.
- Microsoft Clarity: free, unlimited, no volume tier.

The only recurring obligation is keeping the card on the domain valid.
