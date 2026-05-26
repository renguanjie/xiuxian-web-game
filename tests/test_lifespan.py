import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import main


class LifespanTests(unittest.IsolatedAsyncioTestCase):
    async def test_lifespan_skips_db_initialization_by_default(self):
        original = main.settings.INIT_DB_ON_STARTUP
        main.settings.INIT_DB_ON_STARTUP = False
        try:
            with patch("main.init_db", new_callable=AsyncMock) as init_db:
                with patch("main.engine", SimpleNamespace(dispose=AsyncMock())):
                    async with main.lifespan(main.app):
                        pass

            init_db.assert_not_awaited()
        finally:
            main.settings.INIT_DB_ON_STARTUP = original


if __name__ == "__main__":
    unittest.main()
