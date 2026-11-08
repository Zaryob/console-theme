import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SuiteContracts(unittest.TestCase):
    def test_sync_checks_all_targets_and_adapter_packaging(self):
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
            self.assertFalse((base / 'execmap/public/_data').exists())
            for target in targets:
                public = base / target / ('public' if target in ['syscall', 'pin-atlas', 'execmap'] else '')
                registry = 'console-projects.json' if target == 'execmap' else '_data/console_projects.json'
                self.assertEqual((public / registry).read_bytes(), (ROOT / '_data/console_projects.json').read_bytes())
                if target != 'execmap':
                    self.assertTrue((public / '_includes/console-header.html').is_file())
                    self.assertTrue((public / '_data/writing_topics.yml').is_file())
                # These two former forks must never become parity exemptions.
                for relative in ['assets/console/theme.js', 'assets/console/site.svg', 'assets/console/language.js', registry]:
                    with self.subTest(target=target, relative=relative):
                        path = public / relative
                        original = path.read_bytes()
                        path.write_text('outdated')
                        result = run('--check')
                        self.assertEqual(result.returncode, 1)
                        self.assertIn(str(path), result.stdout)
                        self.assertEqual(path.read_text(), 'outdated', '--check must be read-only')
                        self.assertEqual(run().returncode, 0)
                        self.assertEqual(path.read_bytes(), original)
                self.assertIn('See ICONS-LICENSE.txt.', (public / 'assets/console/site.svg').read_text())
                self.assertTrue((public / 'assets/console/ICONS-LICENSE.txt').is_file())
            (base / 'home').rename(base / 'missing-home')
            self.assertEqual(run('--check').returncode, 1)

    def test_duplicate_keys_and_lost_placeholders_fail_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture = Path(directory) / 'i18n.js'
            for dictionary, message in [
                ('{"Position":"Sıra","Position":"Konum"}', 'Duplicate translation key'),
                ('{"{count} results":"Sonuçlar"}', 'Placeholder mismatch'),
                ('{"Results":"{count} sonuç"}', 'Placeholder mismatch'),
            ]:
                fixture.write_text('  const translations = ' + dictionary + ';')
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/check_i18n.py'), str(fixture)], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)


if __name__ == '__main__':
    unittest.main()
