import json
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class VercelConfigTests(unittest.TestCase):
    def test_frontend_is_built_and_spa_routes_do_not_fall_through_to_api(self):
        config = json.loads((PROJECT_ROOT / "vercel.json").read_text(encoding="utf-8"))

        builds = config["builds"]
        self.assertIn(
            {
                "src": "frontend/package.json",
                "use": "@vercel/static-build",
                "config": {"distDir": "dist"},
            },
            builds,
        )

        routes = config["routes"]
        self.assertEqual(routes[0], {"src": "/api/(.*)", "dest": "main.py"})
        self.assertEqual(routes[1], {"src": "/static/games/(.*)", "dest": "main.py"})
        self.assertIn({"handle": "filesystem"}, routes)
        self.assertIn({"src": "/assets/(.*)", "dest": "/frontend/assets/$1"}, routes)
        self.assertIn({"src": "/favicon.svg", "dest": "/frontend/favicon.svg"}, routes)
        self.assertEqual(routes[-1], {"src": "/(.*)", "dest": "/frontend/index.html"})


if __name__ == "__main__":
    unittest.main()
