# Zaryob Console Theme

The shared terminal-styled console interface for the Zaryob suite:
* **[zaryob.github.io](https://zaryob.github.io/)** (Home & Technical Posts)
* **[Kılavuzlar](https://zaryob.github.io/kilavuzlar/)** (Guides & System Administration)
* **[Syscall Reference](https://zaryob.github.io/syscall/)** (Linux System Call Reference)
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
    ├── console_projects.json # The 4 suite projects registry
    └── writing_topics.yml    # Topic taxonomy
```

## Text and layout scale

`assets/console/theme.css` is the canonical source for typography in all four
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

After building all four sites, run the home repository's
`python3 scripts/preview_suite.py --port 4180`. With Playwright installed and
available to Node, run:

```sh
node scripts/check_typography.cjs
```

The browser check covers thirteen page types at five viewport widths, at default
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
verifies the copies in all four sites.

## License

GPL-2.0-or-later. Fonts are licensed under the SIL Open Font License (OFL). SVG icons include Font Awesome Free.
