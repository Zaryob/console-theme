#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Compare a hand-written console header with the canonical include.

Jekyll sites render _includes/console-header.html, so copying the file keeps
them identical. The Node sites (execmap, wire) write the same header as a
template literal in their build script, which nothing copies. This module
reduces both to a skeleton and reports where they differ.

The skeleton keeps what the shared CSS and theme.js depend on: every element
with a console-* class, its nesting, and the ids, form names, ARIA wiring,
data-console-* hooks and option values on it. It ignores text, link targets,
icons, and site-owned markup without a console-* class, such as a site's own
navigation links.
"""

from html.parser import HTMLParser
from pathlib import Path
import re

HEADER = re.compile(r'<header class="console-header">.*?</header>', re.S)
LIQUID_TAG = re.compile(r'\{%-?\s*(.*?)\s*-?%\}', re.S)
LIQUID_OUTPUT = re.compile(r'\{\{.*?\}\}', re.S)
# The home site alone gets the writing/projects/about links; adapters never render them.
HOME_ONLY = "if site.suite_section == 'home'"
KEPT_ATTRIBUTES = ('id', 'name', 'role', 'aria-controls', 'aria-haspopup')
# Sites choose which search a button opens; that hook is theirs.
SITE_OWNED_HOOKS = {'data-console-search', 'data-console-search-compact'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


def extract_header(text: str, source: str) -> str:
    found = HEADER.findall(text)
    if len(found) != 1:
        raise ValueError(f'{source}: expected one <header class="console-header">, found {len(found)}')
    return found[0]


def strip_liquid(text: str) -> str:
    """Drop Liquid tags and outputs, and the whole home-only block."""
    out = []
    position = 0
    depth = 0          # nesting of if/unless/for/case blocks
    skip_from = None   # depth at which the home-only block opened
    for match in LIQUID_TAG.finditer(text):
        if skip_from is None:
            out.append(text[position:match.start()])
        position = match.end()
        tag = match.group(1)
        word = tag.split(None, 1)[0] if tag else ''
        if word in {'if', 'unless', 'for', 'case'}:
            depth += 1
            if skip_from is None and tag == HOME_ONLY:
                skip_from = depth
        elif word in {'endif', 'endunless', 'endfor', 'endcase'}:
            if skip_from == depth:
                skip_from = None
            depth -= 1
    out.append(text[position:])
    return LIQUID_OUTPUT.sub('', ''.join(out))


def strip_interpolations(text: str) -> str:
    """Drop every ${...} of a JavaScript template literal, nested ones included."""
    out = []
    index = 0
    while index < len(text):
        start = text.find('${', index)
        if start < 0:
            out.append(text[index:])
            break
        out.append(text[index:start])
        depth = 1
        index = start + 2
        while index < len(text) and depth:
            depth += {'{': 1, '}': -1}.get(text[index], 0)
            index += 1
    return ''.join(out)


class _Skeleton(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []    # one entry per open element: its label, or None when untracked
        self.selects = []  # open <select> nodes collecting option values
        self.nodes = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = sorted(c for c in (attributes.get('class') or '').split() if c.startswith('console-'))
        hooks = sorted(a for a in attributes if a.startswith('data-console-') and a not in SITE_OWNED_HOOKS)
        label = None
        if classes or hooks or tag == 'select':
            parts = [tag + ''.join(f'.{c}' for c in classes)]
            parts += [f'{a}={attributes[a]}' for a in KEPT_ATTRIBUTES if attributes.get(a)]
            parts += hooks
            label = ' '.join(parts)
            node = {'path': [entry for entry in self.stack if entry] + [label], 'options': []}
            self.nodes.append(node)
            if tag == 'select':
                self.selects.append(node)
        elif tag == 'option' and self.selects:
            self.selects[-1]['options'].append(attributes.get('value') or '')
        if tag not in VOID:
            self.stack.append(label)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        self.stack.pop()
        if tag == 'select' and self.selects:
            self.selects.pop()


def skeleton(header_html: str) -> list:
    parser = _Skeleton()
    parser.feed(header_html)
    parser.close()
    lines = []
    for node in parser.nodes:
        line = ' > '.join(node['path'])
        if node['options']:
            line += ' [' + ','.join(node['options']) + ']'
        lines.append(line)
    return lines


def canonical_skeleton(include: Path) -> list:
    return skeleton(strip_liquid(extract_header(include.read_text(encoding='utf-8'), str(include))))


def adapter_skeleton(build_script: Path) -> list:
    return skeleton(strip_interpolations(extract_header(build_script.read_text(encoding='utf-8'), str(build_script))))


def compare(include: Path, build_script: Path) -> list:
    """Return human-readable differences; an empty list means the header matches."""
    try:
        expected = canonical_skeleton(include)
        actual = adapter_skeleton(build_script)
    except ValueError as error:
        return [str(error)]
    if expected == actual:
        return []
    differences = []
    missing = [line for line in expected if line not in actual]
    extra = [line for line in actual if line not in expected]
    differences += [f'{build_script}: header is missing: {line}' for line in missing]
    differences += [f'{build_script}: header has unexpected: {line}' for line in extra]
    if not missing and not extra:
        position = next(i for i, (a, b) in enumerate(zip(expected, actual)) if a != b)
        differences.append(
            f'{build_script}: header elements are out of order; expected "{expected[position]}" '
            f'where "{actual[position]}" appears')
    return differences


if __name__ == '__main__':
    import sys
    root = Path(__file__).resolve().parents[1]
    include = root / '_includes' / 'console-header.html'
    scripts = [Path(arg) for arg in sys.argv[1:]]
    if not scripts:
        print('\n'.join(canonical_skeleton(include)))
        sys.exit(0)
    found = [difference for script in scripts for difference in compare(include, script)]
    print('\n'.join(found) if found else '✓ header matches the canonical include')
    sys.exit(1 if found else 0)
