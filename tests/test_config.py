import os
import unittest
import warnings
from unittest.mock import patch

from config import Settings


class SettingsTests(unittest.TestCase):
    def test_settings_boots_without_secret_key_env_or_env_file(self):
        with patch.dict(os.environ, {}, clear=True):
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                settings = Settings(_env_file=None)

        self.assertNotEqual(settings.SECRET_KEY, "change-me-to-a-long-random-string")
        self.assertGreaterEqual(len(settings.SECRET_KEY), 32)


if __name__ == "__main__":
    unittest.main()
