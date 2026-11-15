# Zaryob Console Theme

The shared terminal-styled console interface for the Zaryob suite:
* **[zaryob.github.io](https://zaryob.github.io/)** (Home & Technical Posts)
* **[Kılavuzlar](https://zaryob.github.io/kilavuzlar/)** (Guides & System Administration)
* **[Syscall Reference](https://zaryob.github.io/syscall/)** (Linux System Call Reference)
* **[Execmap](https://zaryob.github.io/execmap/)** (ELF Analysis & Reverse Engineering)
* **[Pin Atlas](https://zaryob.github.io/pin-atlas/)** (Interactive Development Board & Chip Pinout Guide)

## Overview

The console theme unifies all sites under an amber/VT100 retro terminal aesthetic with:
* **IBM Plex Mono** for code, headings, prompts, and data tables.
* **IBM Plex Sans** for long-form prose and articles.
* **Terminal prompt navigation:** `zaryob:~$` dropdown project switcher.
* **Light / Dark theme toggle:** System, Dark (`#171a1f` / `#e2b56f`), and Light (`#f5f3ed` / `#815310`).
* **Bilingual UI controls:** English and Turkish localizations (`i18n.js`).
* **Search dialog:** Global `/` shortcut with Pagefind support.

## Repository Structure

```text
console-theme/
├── assets/console/           # Copied byte-for-byte to all five sites
│   ├── theme.css             # Main console layout and color variables
│   ├── theme.js              # Theme switcher, search dialog, code copy buttons, ?highlight=
│   ├── language.js           # Shared preference, URL and storage state
│   ├── i18n.js               # Common UI localization dictionary
│   ├── site.svg              # Theme vector icon set
│   ├── regular.svg           # File & folder icons
│   ├── select-chevron.svg    # Form controls dropdown indicator
│   ├── ICONS-LICENSE.txt     # Font Awesome Free attribution for the SVG files
│   └── fonts/                # IBM Plex Mono and Sans webfonts, OFL.txt
├── _includes/                # Jekyll layout components (the four Jekyll sites)
│   ├── console-header.html   # Shared terminal prompt header
│   ├── console-icon.html     # SVG sprite helper
│   ├── console-content-language.html # Translation notification strip
│   ├── console-alternates.html       # SEO hreflang generator (tr, en, x-default)
│   └── console/              # Mirror of the four includes, refreshed by sync.py
├── _data/                    # Registry data
│   ├── console_projects.json # The 5 suite projects registry
│   ├── writing_topics.yml    # Topic taxonomy
│   └── console/              # Mirror of the two data files, refreshed by sync.py
├── scripts/
│   ├── sync.py               # Copies the files above to the sibling repositories; --check verifies them
│   ├── check_i18n.py         # Vocabulary validation (duplicate keys, placeholders)
│   ├── check_typography.cjs  # Browser typography matrix against a local suite preview
│   └── check_assets_export.py # Compares a ref with assets/console (legacy `assets` branch only)
├── tests/
│   ├── test_sync.py          # sync.py and vocabulary contract (npm test)
│   └── theme.test.cjs        # Playwright regressions (npm run test:console)
├── .github/workflows/ci.yml  # Runs check_i18n.py, npm test and npm run test:console
├── package.json              # Pins Playwright; no runtime dependencies
└── LICENSE                   # GPL-2.0-or-later
```

## Text and layout scale

`assets/console/theme.css` is the canonical source for typography in all five
sites. App styles should use its variables instead of introducing pixel sizes:

* `--text-base`: `1rem` for body text and form fields.
* `--text-prose`: `1.125rem` for articles and guides, with `--line-prose: 1.8`.
* `--text-sm` / `--text-xs`: `.875rem` / `.8125rem` for secondary text and metadata.
* `--text-h1` through `--text-h4`: the shared heading hierarchy.
* `--font-mono` / `--font-prose`: locally bundled IBM Plex Mono / Sans.

These are relative to the reader's browser text setting; at the usual 16px
default, body text is 16px and prose is 18px. Mobile layouts reflow instead of
reducing body or code text. SVG pin labels retain their drawing coordinates;
the map scrolls inside its own panel. `--shell-width` and `--gutter` keep the
outer layout aligned across sites.

Install the pinned browser tooling with `npm ci` (and `npx playwright install chromium`
if no browser is installed). After building all five sites, run the home repository's
`python3 scripts/preview_suite.py --port 4180`. With Playwright installed and
available to Node, run:

```sh
npm run test:typography
```

The browser check covers fifteen page types at five viewport widths, at default
and 200% text sizes. It checks loaded fonts, readable article and form text,
JavaScript/asset errors, and page overflow. Tables and pin diagrams may scroll
inside their panels. Set `ZARYOB_PREVIEW_URL` for another preview address, or
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for a system Chromium installation.

## Distributing the theme

`scripts/sync.py` is the only update mechanism. Make shared changes in this
repository on `main`, then copy them into the sibling checkouts (expected next
to this one: `../zaryob.github.io`, `../kilavuzlar`, `../syscall`,
`../pin-atlas`, `../execmap`; each path can be overridden, see `--help`):

```sh
python3 scripts/sync.py            # copy assets, includes and registry
python3 scripts/sync.py --check    # read-only parity check, exit 1 on any difference
```

Every target is validated before the first file is written, so a missing
checkout cannot leave the suite half-updated. `--commit "msg"` and
`--auto-commit` additionally commit in each sibling: only the files the script
wrote (other staged work is left staged and uncommitted), and only when every
sibling is on `main`. Nothing is pushed.

`--check` also rejects files under a target's `assets/console/` that are not
canonical. Site-owned files that belong there are listed per target in
`ALLOWED_EXTRAS` in `scripts/sync.py` (currently `bundle.scss` and `site.css`
in the home site, `syscall.css` in Syscall, `COPYING` in Execmap); copy mode
reports other extras and never deletes them.

To add the theme to a new site, add the target to `scripts/sync.py` and run it.

The sites do not use `git subtree`. An `assets` branch with a flattened
`assets/console/` export still exists from an earlier workflow; it is not
updated and must not be pulled. `scripts/check_assets_export.py` only compares
such a ref with `HEAD:assets/console` and is not part of `npm run check` or CI.

## License

GPL-2.0-or-later (see `LICENSE`). Fonts are licensed under the SIL Open Font License (`assets/console/fonts/OFL.txt`). SVG icons include Font Awesome Free, CC BY 4.0 (`assets/console/ICONS-LICENSE.txt`).

## Integration and language contract

Run `python3 scripts/sync.py`, then `python3 scripts/sync.py --check`.
All five configured targets must exist for the check to pass. The four Jekyll
sites receive the assets, includes and registry. Every canonical file under
`assets/console/` is byte-identical in every target, including `theme.js` and
`site.svg`; there are no per-site asset substitutions or parity exemptions, and
the only additional files allowed there are the ones in `ALLOWED_EXTRAS`.
The SVG attribution points to the bundled sibling `ICONS-LICENSE.txt`.
`theme.js` uses English source labels (including interpolation) when no
vocabulary adapter is loaded; bilingual consumers translate those labels
through their adapter.

Packaging differences are explicit in `scripts/sync.py`: the Jekyll sites use
`assets/console/` or `public/assets/console/`, `_includes/` and `_data/`.
Execmap uses `public/assets/console/` and receives the byte-identical registry
as `public/console-projects.json`, without Jekyll includes or topic data. Its
Node build owns the rendered header, local search and English language policy;
these generated templates are not copies of the Jekyll includes.
It emits `search.json` with title, description, full text, URL, type and content
language. Shared search queries this adapter alongside Pagefind and when
Pagefind is unavailable, preserving each record's `lang` (currently `en`).
Execmap's content and controls remain English under saved Turkish preferences,
Turkish browser locales and `?lang=tr`. It does not load `language.js` or
`i18n.js` or render a language selector. Those files are distributed for parity,
not automatically enabled. A theme sync must not change this product policy.

For bilingual consumers, load `language.js` before the vocabulary adapter (`i18n.js`, or Pin Atlas's own
`/i18n.js`) and before `theme.js`. Language precedence is a supported `?lang`,
then a saved preference, then the primary browser language (TR for Turkish,
EN otherwise). Invalid saved values are ignored. The first two are an explicit
choice (`ZaryobLanguage.explicit`); the browser language is only a guess. A
guess translates the shared controls and nothing else: it never navigates to
another edition, is not stored, and is not appended to project or search links.
Only an explicit choice (the language selector, a saved selection, or `?lang=`)
follows the page's registered alternate edition. The content-language note
offers the other edition in every case.

`<html lang>` always states the language of the page content and the shared
scripts do not rewrite it (Pagefind is handed the interface language through it
for one synchronous call and the content language is restored at once). The interface language is exposed as
`data-ui-language` on `<html>` (and `ZaryobLanguage.language`); translated
controls carry their own `lang`. Site code and styles that need the interface
language must read `data-ui-language`, not `document.documentElement.lang`.
Shared search follows the interface language.

Both adapters subscribe to `ZaryobLanguage`; storage changes update open tabs
without forced content navigation. Project links carry only an explicit
language preference, so they also work with storage disabled. Each adapter owns
its application vocabulary. Article bodies keep their actual `lang`; existing
alternate links determine edition navigation independently of the project's
baseurl. Query and fragment state survive edition changes. Pagination stays put
when content already uses the requested language. `console-alternates.html`
emits `hreflang="x-default"` pointing at the Turkish edition (or at the page
itself when no Turkish edition is registered).

Validate the canonical dictionary before syncing:

```sh
python3 scripts/check_i18n.py
node --test ../zaryob.github.io/scripts/test_i18n.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

`check_i18n.py` rejects duplicate keys and mismatched placeholders; sync runs it before copying.
`npm run check` runs vocabulary and five-target parity checks (it needs the
sibling checkouts); `npm test` runs isolated sync/repair checks, asset and
registry drift rejection in all five targets, stale-file and missing-target
rejection, the commit safeguards and negative vocabulary fixtures. Run
`npm run test:console` for the shared English fallback, Turkish adapter,
explicit-choice navigation, `<html lang>` preservation, highlighting and
search robustness browser regressions (requires installed Chromium).
`.github/workflows/ci.yml` runs `check_i18n.py`, `npm test` and
`npm run test:console` on every push to `main` and on pull requests.
The typography browser
regression matrix now includes execmap (15 page types × 5 widths × 2 text sizes).
No site is published by these commands.

Favicon policy: Home and Guides use the suite root `/favicon.ico`; Pin Atlas
and Execmap retain their application SVG icons. Syscall retains the browser's
origin-root favicon fallback. Guides root titles omit a repeated site name.
