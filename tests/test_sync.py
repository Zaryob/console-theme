import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SuiteContracts(unittest.TestCase):
    def test_sync_checks_execmap_assets_registry_and_missing_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            targets = ['guides', 'home', 'syscall', 'pin-atlas', 'execmap']
            for target in targets:
                (base / target).mkdir()
            command = [sys.executable, str(ROOT / 'scripts/sync.py')]
            for target in targets:
                command.extend([f'--{target}', str(base / target)])

            def run(*options):
                return subprocess.run(command + list(options), capture_output=True, text=True)

            self.assertEqual(run().returncode, 0)
            self.assertEqual(run('--check').returncode, 0)
            self.assertFalse((base / 'execmap/public/_includes').exists())
            for relative in ['assets/console/language.js', 'console-projects.json']:
                path = base / 'execmap/public' / relative
                path.write_text('outdated')
                result = run('--check')
                self.assertEqual(result.returncode, 1)
                self.assertIn(str(path), result.stdout)
                self.assertEqual(run().returncode, 0)
            (base / 'home').rename(base / 'missing-home')
            self.assertEqual(run('--check').returncode, 1)

    def test_duplicate_keys_and_lost_placeholders_fail_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / 'i18n.js'
            for dictionary in ['{"Position":"Sıra","Position":"Konum"}', '{"{count} results":"Sonuçlar"}']:
                fixture.write_text('  const translations = ' + dictionary + ';')
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/check_i18n.py'), str(fixture)], capture_output=True)
                self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
