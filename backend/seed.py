"""种子数据脚本 - 初始化游戏、角色、成就"""
import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.database import async_session


async def seed():
    async with async_session() as session:
        # 初始化角色 (JSON 字段必须显式传入)
        roles = [
            ("admin", "管理员", ["all"]),
            ("moderator", "版主", ["manage_users", "manage_games", "view_audit"]),
            ("player", "玩家", ["play_games", "view_leaderboard", "edit_profile"]),
            ("banned", "封禁用户", []),
        ]
        for name, display, perms in roles:
            result = await session.execute(
                text("SELECT id FROM roles WHERE name = :name"), {"name": name}
            )
            if not result.fetchone():
                import json
                await session.execute(
                    text(
                        "INSERT INTO roles (name, display_name, permissions) VALUES (:name, :display, :perms)"
                    ),
                    {"name": name, "display": display, "perms": json.dumps(perms)},
                )

        # 初始化游戏 (JSON 字段必须显式传入)
        games = [
            {
                "name": "修仙幸存者",
                "slug": "survivor",
                "description": "在妖兽横行的修仙世界中，你是唯一的幸存者！击杀妖兽，收集灵石，不断提升修为，看看你能坚持多久！",
                "thumbnail": "/games/cultivation-survivors/thumbnail.svg",
                "path": "cultivation-survivors/index.html",
                "category": "survival",
                "tags": ["动作", "幸存者", "修仙"],
                "sort_order": 4,
                "config": {"timeout": 1800, "score_rules": "standard"},
            },
            {
                "name": "修仙塔防",
                "slug": "tower-defense",
                "description": "布置修仙阵法，抵御妖兽入侵！选择合适的防御塔，升级阵法，守护你的灵脉！",
                "thumbnail": "/games/cultivation-tower-defense/thumbnail.svg",
                "path": "cultivation-tower-defense/index.html",
                "category": "tower-defense",
                "tags": ["策略", "塔防", "修仙"],
                "sort_order": 3,
                "config": {"timeout": 3600, "score_rules": "defense"},
            },
            {
                "name": "修仙贪吃蛇",
                "slug": "snake",
                "description": "吞噬天地灵气，不断成长！经典贪吃蛇玩法融合修仙元素，收集灵药，避开毒障！",
                "thumbnail": "/games/cultivation-snake/thumbnail.svg",
                "path": "cultivation-snake/index.html",
                "category": "snake",
                "tags": ["经典", "贪吃蛇", "修仙"],
                "sort_order": 2,
                "config": {"timeout": 900, "score_rules": "length"},
            },
            {
                "name": "仙剑射击",
                "slug": "shooter",
                "description": "御剑飞行，弹幕射击！操控仙剑消灭敌人，收集法宝，挑战Boss！",
                "thumbnail": "/games/xianjian-shooter/thumbnail.svg",
                "path": "xianjian-shooter/index.html",
                "category": "shooter",
                "tags": ["射击", "弹幕", "修仙"],
                "sort_order": 1,
                "config": {"timeout": 600, "score_rules": "kill"},
            },
            # --- 新增8个游戏 ---
            {
                "name": "炼丹仙人",
                "slug": "alchemy-immortal",
                "description": "交换相邻的灵材，将3个或更多相同灵材连成一线！合成灵丹，获得修为，限时60秒挑战最高修为！",
                "thumbnail": "/games/alchemy-immortal/thumbnail.svg",
                "path": "alchemy-immortal/index.html",
                "category": "puzzle",
                "tags": ["经典", "三消", "修仙"],
                "sort_order": 5,
                "config": {"timeout": 60, "score_rules": "combo"},
            },
            {
                "name": "飞升仙人",
                "slug": "ascension",
                "description": "在灵台上跳跃，不断向上攀登！跳得越高，修为越多，到达天庭即可飞升！",
                "thumbnail": "/games/ascension/thumbnail.svg",
                "path": "ascension/index.html",
                "category": "platformer",
                "tags": ["跳跃", "攀爬", "修仙"],
                "sort_order": 6,
                "config": {"timeout": 0, "score_rules": "height"},
            },
            {
                "name": "仙兽进化",
                "slug": "beast-evolution",
                "description": "控制仙兽吞噬比自己小的灵兽获得修为，躲避比自己大的灵兽，积累足够修为即可进化！",
                "thumbnail": "/games/beast-evolution/thumbnail.svg",
                "path": "beast-evolution/index.html",
                "category": "action",
                "tags": ["吞噬", "进化", "修仙"],
                "sort_order": 7,
                "config": {"timeout": 0, "score_rules": "evolution"},
            },
            {
                "name": "锤墙仙人",
                "slug": "hammer-wall",
                "description": "消除灵阵行获得修为！消除越多境界越高，经典方块消除玩法！",
                "thumbnail": "/games/hammer-wall/thumbnail.svg",
                "path": "hammer-wall/index.html",
                "category": "puzzle",
                "tags": ["方块", "消除", "修仙"],
                "sort_order": 8,
                "config": {"timeout": 0, "score_rules": "lines"},
            },
            {
                "name": "挖矿仙人",
                "slug": "cultivation-mine",
                "description": "探宝扫雷，挖出修仙资源！左键挖掘，右键标记，找出隐藏的灵石和宝藏！",
                "thumbnail": "/games/cultivation-mine/thumbnail.svg",
                "path": "cultivation-mine/index.html",
                "category": "puzzle",
                "tags": ["扫雷", "挖矿", "修仙"],
                "sort_order": 9,
                "config": {"timeout": 0, "score_rules": "minesweeper"},
            },
            {
                "name": "愤怒仙兽",
                "slug": "cultivation-angry",
                "description": "弹弓射击，击碎妖兽堡垒！调整角度和力度，一击必杀！",
                "thumbnail": "/games/cultivation-angry/thumbnail.svg",
                "path": "cultivation-angry/index.html",
                "category": "puzzle",
                "tags": ["弹弓", "物理", "修仙"],
                "sort_order": 10,
                "config": {"timeout": 0, "score_rules": "shots"},
            },
            {
                "name": "炸弹仙人",
                "slug": "cultivation-bomb",
                "description": "回合制爆破，放置炸弹消灭妖兽！经典炸弹玩法，策略性消除！",
                "thumbnail": "/games/cultivation-bomb/thumbnail.svg",
                "path": "cultivation-bomb/index.html",
                "category": "puzzle",
                "tags": ["炸弹", "策略", "修仙"],
                "sort_order": 11,
                "config": {"timeout": 0, "score_rules": "bomb"},
            },
            {
                "name": "仙剑索敌",
                "slug": "cultivation-sword",
                "description": "连线斩妖，御剑飞行斩灭一切敌人！经典连线消除战斗！",
                "thumbnail": "/games/cultivation-sword/thumbnail.svg",
                "path": "cultivation-sword/index.html",
                "category": "puzzle",
                "tags": ["连线", "战斗", "修仙"],
                "sort_order": 12,
                "config": {"timeout": 0, "score_rules": "sword"},
            },
        ]
        import json

        for g in games:
            result = await session.execute(
                text("SELECT id FROM games WHERE slug = :slug"), {"slug": g["slug"]}
            )
            if not result.fetchone():
                await session.execute(
                    text("""
                        INSERT INTO games (name, slug, description, thumbnail, path, category, tags, sort_order, config)
                        VALUES (:name, :slug, :description, :thumbnail, :path, :category, :tags, :sort_order, :config)
                    """),
                    {
                        "name": g["name"],
                        "slug": g["slug"],
                        "description": g["description"],
                        "thumbnail": g["thumbnail"],
                        "path": g["path"],
                        "category": g["category"],
                        "tags": json.dumps(g["tags"]),
                        "sort_order": g["sort_order"],
                        "config": json.dumps(g["config"]),
                    },
                )

        # 初始化成就 (requirement 是 NOT NULL JSON, 必须显式传入)
        achievements = [
            (
                "first_play",
                "初入修仙",
                "完成第一次游戏",
                "🎮",
                "general",
                {"type": "game_count", "value": 1},
                10,
                "common",
            ),
            (
                "play_10",
                "修仙入门",
                "累计游玩10次",
                "🌱",
                "general",
                {"type": "game_count", "value": 10},
                20,
                "common",
            ),
            (
                "play_100",
                "修仙达人",
                "累计游玩100次",
                "⚡",
                "general",
                {"type": "game_count", "value": 100},
                50,
                "uncommon",
            ),
            (
                "score_1000",
                "千分高手",
                "单局得分超过1000",
                "🏆",
                "score",
                {"type": "score_threshold", "value": 1000},
                30,
                "uncommon",
            ),
            (
                "score_10000",
                "万分大佬",
                "单局得分超过10000",
                "👑",
                "score",
                {"type": "score_threshold", "value": 10000},
                80,
                "rare",
            ),
            (
                "streak_7",
                "七日修行",
                "连续登录7天",
                "🔥",
                "streak",
                {"type": "streak", "value": 7},
                40,
                "uncommon",
            ),
            (
                "streak_30",
                "月度修行者",
                "连续登录30天",
                "💎",
                "streak",
                {"type": "streak", "value": 30},
                100,
                "epic",
            ),
            (
                "all_games",
                "全制霸",
                "玩过所有游戏各至少一次",
                "🌟",
                "general",
                {"type": "play_all_games", "value": 4},
                60,
                "rare",
            ),
            (
                "legend",
                "修仙传奇",
                "总得分超过100000",
                "🐉",
                "score",
                {"type": "total_score", "value": 100000},
                200,
                "legendary",
            ),
        ]
        for code, name, desc, icon, cat, req, points, rarity in achievements:
            result = await session.execute(
                text("SELECT id FROM achievements WHERE code = :code"), {"code": code}
            )
            if not result.fetchone():
                await session.execute(
                    text("""
                        INSERT INTO achievements (code, name, description, icon, category, requirement, points, rarity)
                        VALUES (:code, :name, :desc, :icon, :cat, :req, :points, :rarity)
                    """),
                    {
                        "code": code,
                        "name": name,
                        "desc": desc,
                        "icon": icon,
                        "cat": cat,
                        "req": json.dumps(req),
                        "points": points,
                        "rarity": rarity,
                    },
                )

        await session.commit()
        print("✅ 种子数据初始化完成")


if __name__ == "__main__":
    asyncio.run(seed())
