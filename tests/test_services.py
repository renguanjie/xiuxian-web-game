import unittest
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy.sql.elements import TextClause

import models.achievement  # noqa: F401
import models.game  # noqa: F401
import models.record  # noqa: F401
import models.refresh_token  # noqa: F401
import models.review  # noqa: F401
import models.role  # noqa: F401
import models.user  # noqa: F401
from database import build_connect_config, connect_args
from database import Base
from models.refresh_token import RefreshToken
from models.user import User
from rate_limit import get_real_ip
from services.auth_service import AuthService
from services.game_service import GameService
from services.leaderboard_service import LeaderboardService


class _Result:
    def __init__(self, scalar=None, rows=None):
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalar(self):
        return self._scalar

    def mappings(self):
        return self

    def all(self):
        return self._rows


class _RecordingDb:
    def __init__(self, results):
        self.results = list(results)
        self.statements = []

    async def execute(self, statement, params=None):
        self.statements.append(statement)
        if isinstance(statement, TextClause):
            raise AssertionError("排行榜查询不应使用数据库方言敏感的原始 SQL")
        return self.results.pop(0)


class _AuthDb:
    def __init__(self, results):
        self.results = list(results)
        self.added = []

    async def execute(self, statement):
        return self.results.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        for obj in self.added:
            if isinstance(obj, User) and obj.id is None:
                obj.id = 42


class ServiceQueryTests(unittest.IsolatedAsyncioTestCase):
    def test_model_index_names_are_unique_for_postgresql(self):
        index_names = [
            index.name
            for table in Base.metadata.tables.values()
            for index in table.indexes
            if index.name
        ]

        self.assertEqual(len(index_names), len(set(index_names)))

    def test_database_does_not_force_ssl_by_default(self):
        self.assertEqual(connect_args, {})

    def test_database_converts_sslmode_query_to_asyncpg_ssl_arg(self):
        url, args = build_connect_config(
            "postgresql+asyncpg://user:pass@example.com/db?sslmode=require",
            db_ssl=False,
        )

        self.assertEqual(args, {"ssl": "require"})
        self.assertNotIn("sslmode", str(url))

    def test_rate_limit_ignores_spoofed_forwarded_for_from_untrusted_client(self):
        request = SimpleNamespace(
            headers={"X-Forwarded-For": "1.2.3.4"},
            client=SimpleNamespace(host="203.0.113.10"),
        )

        self.assertEqual(get_real_ip(request), "203.0.113.10")

    async def test_register_persists_hashed_refresh_token(self):
        role = SimpleNamespace(id=3, name="player")
        db = _AuthDb([_Result(None), _Result(None), _Result(role)])

        with patch("services.auth_service.hash_password", return_value="hashed-password"):
            tokens = await AuthService(db).register(
                username="tester",
                email="tester@example.com",
                password="Password123",
                ip_address="127.0.0.1",
            )

        refresh_rows = [obj for obj in db.added if isinstance(obj, RefreshToken)]
        self.assertEqual(len(refresh_rows), 1)
        self.assertEqual(refresh_rows[0].user_id, 42)
        self.assertNotEqual(refresh_rows[0].token_hash, tokens["refresh_token"])

    async def test_game_detail_filters_inactive_games(self):
        db = _RecordingDb([_Result(None)])

        await GameService(db).get_by_slug("hidden-game")

        compiled = str(db.statements[0].compile(compile_kwargs={"literal_binds": True}))
        self.assertIn("games.status", compiled)
        self.assertIn("'active'", compiled)

    async def test_leaderboard_uses_sqlalchemy_queries(self):
        game = SimpleNamespace(id=1, name="修仙贪吃蛇", slug="snake")
        db = _RecordingDb([_Result(game), _Result(rows=[]), _Result(0)])

        result = await LeaderboardService(db).get_game_leaderboard(1)

        self.assertEqual(result["total"], 0)
        self.assertEqual(result["leaderboard"], [])
        self.assertTrue(all(not isinstance(stmt, TextClause) for stmt in db.statements))


if __name__ == "__main__":
    unittest.main()
