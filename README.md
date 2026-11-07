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
├── assets/console/
│   ├── theme.css             # Main console layout and color variables
│   ├── theme.js              # Theme switcher, search dialog, code copy buttons
│   ├── language.js           # Shared preference, URL and storage state
│   ├── i18n.js               # Common UI localization dictionary
│   ├── site.svg              # Theme vector icon set
│   ├── regular.svg           # File & folder icons
│   ├── select-chevron.svg    # Form controls dropdown indicator
│   └── fonts/                # IBM Plex Mono and Sans webfonts
├── _includes/                # Jekyll layout components
│   ├── console-header.html   # Shared terminal prompt header
│   ├── console-icon.html     # SVG sprite helper
│   ├── console-content-language.html # Translation notification strip
│   └── console-alternates.html       # SEO hreflang generator
└── _data/                    # Registry data
    ├── console_projects.json # The 5 suite projects registry
    └── writing_topics.yml    # Topic taxonomy
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

## Usage with Git Subtree

`main` contains the canonical source, templates, registry and sync tools. The
`assets` branch is the flattened `assets/console/` export used by site subtrees;
templates and registry files are synchronized separately by `scripts/sync.py`.

### Adding to a project
To add this theme to a project repository:

```sh
# For Jekyll projects (into _console or assets/console):
git subtree add --prefix assets/console https://github.com/Zaryob/console-theme.git assets --squash
```

### Pulling theme updates
When updates are pushed to `console-theme`:

```sh
git subtree pull --prefix assets/console https://github.com/Zaryob/console-theme.git assets --squash
```

### Publishing the shared assets
Make shared changes in this repository first. After committing them to `main`,
export the assets for subtree consumers:

```sh
git subtree push --prefix assets/console origin assets
```

Verify the complete export tree, including unexpected nested files:

```sh
git fetch origin assets
python3 scripts/check_assets_export.py origin/assets
```

This compares the export with `HEAD:assets/console`. The flat export must not
contain another `assets/console/` directory. `scripts/sync.py --check` separately
verifies the copies in all five sites.

## License

GPL-2.0-or-later. Fonts are licensed under the SIL Open Font License (OFL). SVG icons include Font Awesome Free.

## Integration and language contract

Run `python3 scripts/sync.py`, then `python3 scripts/sync.py --check`.
All five configured targets must exist for the check to pass. The four Jekyll
sites receive the assets, includes and registry. Execmap receives the assets and
`public/console-projects.json`; its Node build renders the same five projects
without Jekyll includes. It also emits `search.json` with title, description,
full text, URL, type and content language. Shared search queries this adapter
alongside Pagefind and when Pagefind is unavailable. Execmap retains its local
search, and explicitly identifies its content and local search as Turkish.

Load `language.js` before the vocabulary adapter (`i18n.js`, or Pin Atlas's own
`/i18n.js`) and before `theme.js`. Language precedence is a supported `?lang`,
then a saved preference, then the primary browser language (TR for Turkish,
EN otherwise). Invalid saved values are ignored. Both adapters subscribe to
`ZaryobLanguage`; storage changes update open tabs without forced content
navigation. Project links carry only the selected language preference, so they
also work with storage disabled. Each adapter owns its application vocabulary.
Article bodies keep their actual `lang`; existing alternate links determine
edition navigation independently of the project's baseurl. Query and fragment
state survive edition changes. Pagination stays put when content already uses
the requested language.

Validate the canonical dictionary before syncing:

```sh
python3 scripts/check_i18n.py
node --test ../zaryob.github.io/scripts/test_i18n.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

`check_i18n.py` rejects duplicate keys and mismatched placeholders; sync runs it before copying.
`npm run check` runs vocabulary and five-target parity checks; `npm test` runs
the isolated sync and negative vocabulary fixtures. The browser
regression matrix now includes execmap (15 page types × 5 widths × 2 text sizes).
No site is published by these commands.

Favicon policy: Home and Guides use the suite root `/favicon.ico`; Pin Atlas
and Execmap retain their application SVG icons. Syscall retains the browser's
origin-root favicon fallback. Guides root titles omit a repeated site name.
