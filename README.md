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

## Usage with Git Subtree

### Adding to a project
To add this theme to a project repository:

```sh
# For Jekyll projects (into _console or assets/console):
git subtree add --prefix assets/console https://github.com/Zaryob/console-theme.git main --squash
```

### Pulling theme updates
When updates are pushed to `console-theme`:

```sh
git subtree pull --prefix assets/console https://github.com/Zaryob/console-theme.git main --squash
```

### Pushing changes back
If you modify theme files in a child repository and want to upstream them:

```sh
git subtree push --prefix assets/console https://github.com/Zaryob/console-theme.git main
```

## License

GPL-2.0-or-later. Fonts are licensed under the SIL Open Font License (OFL). SVG icons include Font Awesome Free.
