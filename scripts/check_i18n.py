#!/usr/bin/env python3
"""Reject duplicate vocabulary keys and mismatched interpolation placeholders."""
import json
from pathlib import Path
import re
import sys


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate translation key: {key}')
        result[key] = value
    return result


def vocabulary(path):
    source = path.read_text().split('  const translations = ', 1)[1]
    return json.JSONDecoder(object_pairs_hook=unique_pairs).raw_decode(source)[0]


def validate(path):
    strings = vocabulary(path)
    for original, translated in strings.items():
        if set(re.findall(r'\{\w+\}', original)) != set(re.findall(r'\{\w+\}', translated)):
            raise ValueError(f'Placeholder mismatch: {original}')
    return strings


if __name__ == '__main__':
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / 'assets/console/i18n.js'
    try:
        strings = validate(path)
    except (ValueError, IndexError) as error:
        raise SystemExit(str(error))
    print(f'Validated {len(strings)} unique UI strings and their placeholders.')
