-- ============================================================
-- 修仙游戏平台 - 数据库初始化脚本
-- MySQL 8.0+ / utf8mb4 / InnoDB
-- 使用方法: mysql -u root -proot < backend/init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS xiuxian_games
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE xiuxian_games;

-- 1. 角色表
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(32)  NOT NULL UNIQUE COMMENT '角色名',
    display_name VARCHAR(64) NOT NULL COMMENT '显示名称',
    description  VARCHAR(256) DEFAULT '' COMMENT '角色描述',
    permissions  JSON         COMMENT '权限列表',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB COMMENT='用户角色';

INSERT IGNORE INTO roles (name, display_name, permissions) VALUES
  ('admin',     '管理员',   '["all"]'),
  ('moderator', '版主',     '["manage_users","manage_games","view_audit"]'),
  ('player',    '玩家',     '["play_games","view_leaderboard","edit_profile"]'),
  ('banned',    '封禁用户', '[]');

-- 2. 用户表
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(32)  NOT NULL UNIQUE COMMENT '用户名',
    email           VARCHAR(128) NOT NULL UNIQUE COMMENT '邮箱',
    password_hash   VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希',
    role_id         INT UNSIGNED NOT NULL DEFAULT 3 COMMENT '外键->roles.id',
    avatar          VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
    bio             VARCHAR(512) DEFAULT '' COMMENT '个人简介',
    is_active       TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否激活',
    last_login      TIMESTAMP    NULL DEFAULT NULL,
    last_login_ip   VARCHAR(45)  DEFAULT NULL,
    email_verified  TINYINT(1)   NOT NULL DEFAULT 0,
    verification_token VARCHAR(128) DEFAULT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE,
    INDEX idx_email (email), INDEX idx_role (role_id),
    INDEX idx_active (is_active), INDEX idx_username (username)
) ENGINE=InnoDB COMMENT='用户表';

-- 3. 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL UNIQUE COMMENT '外键->users.id',
    total_games     INT UNSIGNED NOT NULL DEFAULT 0,
    total_duration  INT UNSIGNED NOT NULL DEFAULT 0,
    best_score      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    favorite_game_id INT UNSIGNED DEFAULT NULL,
    current_streak  INT UNSIGNED NOT NULL DEFAULT 0,
    longest_streak  INT UNSIGNED NOT NULL DEFAULT 0,
    last_played     TIMESTAMP    NULL DEFAULT NULL,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户游戏统计';

-- 4. 游戏表
CREATE TABLE IF NOT EXISTS games (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(64)  NOT NULL COMMENT '游戏名称',
    slug            VARCHAR(64)  NOT NULL UNIQUE COMMENT 'URL友好标识',
    description     TEXT         NOT NULL COMMENT '游戏描述',
    thumbnail       VARCHAR(512) NOT NULL COMMENT '缩略图URL',
    banner          VARCHAR(512) DEFAULT NULL COMMENT '横幅图URL',
    path            VARCHAR(512) NOT NULL COMMENT '游戏入口路径',
    category        VARCHAR(32)  NOT NULL DEFAULT 'survival' COMMENT '分类',
    tags            JSON         COMMENT '标签列表',
    status          ENUM('active','maintenance','hidden','archived') NOT NULL DEFAULT 'active',
    sort_order      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重',
    play_count      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总游玩次数',
    avg_score       DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '平均分数',
    max_score       BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最高分',
    version         VARCHAR(16)  NOT NULL DEFAULT '1.0.0' COMMENT '版本号',
    config          JSON         COMMENT '游戏配置',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug), INDEX idx_category (category),
    INDEX idx_status (status), INDEX idx_sort (sort_order),
    INDEX idx_play_count (play_count)
) ENGINE=InnoDB COMMENT='游戏目录';

-- 5. 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL COMMENT '外键->users.id',
    game_id         INT UNSIGNED NOT NULL COMMENT '外键->games.id',
    score           BIGINT UNSIGNED NOT NULL DEFAULT 0,
    duration        INT UNSIGNED NOT NULL DEFAULT 0,
    metadata        JSON         COMMENT '额外数据',
    is_new_record   TINYINT(1)   NOT NULL DEFAULT 0,
    ip_address      VARCHAR(45)  DEFAULT NULL,
    user_agent      VARCHAR(512) DEFAULT NULL,
    played_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_record_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_record_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_user_game (user_id, game_id),
    INDEX idx_game_score (game_id, score),
    INDEX idx_played_at (played_at),
    INDEX idx_user_recent (user_id, played_at)
) ENGINE=InnoDB COMMENT='游戏游玩记录';

-- 7. 成就系统
CREATE TABLE IF NOT EXISTS achievements (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(64)  NOT NULL UNIQUE COMMENT '成就代码',
    name            VARCHAR(128) NOT NULL COMMENT '成就名称',
    description     VARCHAR(256) NOT NULL COMMENT '成就描述',
    icon            VARCHAR(512) NOT NULL COMMENT '图标',
    category        VARCHAR(32)  NOT NULL DEFAULT 'general',
    requirement     JSON         NOT NULL COMMENT '解锁条件',
    points          INT UNSIGNED NOT NULL DEFAULT 0,
    rarity          ENUM('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category), INDEX idx_rarity (rarity), INDEX idx_active (is_active)
) ENGINE=InnoDB COMMENT='成就定义';

CREATE TABLE IF NOT EXISTS achievements_unlocked (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    achievement_id  INT UNSIGNED NOT NULL,
    unlocked_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress        DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    CONSTRAINT fk_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_unlock_ach FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB COMMENT='用户已解锁成就';

-- 8. JWT 刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    expires_at      TIMESTAMP    NOT NULL,
    ip_address      VARCHAR(45)  DEFAULT NULL,
    user_agent      VARCHAR(512) DEFAULT NULL,
    is_revoked      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_revoked),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB COMMENT='JWT刷新令牌';

-- 9. 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED DEFAULT NULL,
    action          VARCHAR(64)  NOT NULL,
    resource_type   VARCHAR(32)  DEFAULT NULL,
    resource_id     INT UNSIGNED DEFAULT NULL,
    old_value       JSON         DEFAULT NULL,
    new_value       JSON         DEFAULT NULL,
    ip_address      VARCHAR(45)  DEFAULT NULL,
    user_agent      VARCHAR(512) DEFAULT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_action (user_id, action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB COMMENT='审计日志';

-- 10. 成就初始化
INSERT IGNORE INTO achievements (code, name, description, icon, category, requirement, points, rarity) VALUES
  ('first_play',   '初入修仙',    '完成第一次游戏',         '🎮', 'general',   '{"type":"game_count","value":1}',          10, 'common'),
  ('play_10',      '修仙入门',    '累计游玩10次',           '🌱', 'general',   '{"type":"game_count","value":10}',         20, 'common'),
  ('play_100',     '修仙达人',    '累计游玩100次',          '⚡', 'general',   '{"type":"game_count","value":100}',        50, 'uncommon'),
  ('score_1000',   '千分高手',    '单局得分超过1000',       '🏆', 'score',     '{"type":"score_threshold","value":1000}',  30, 'uncommon'),
  ('score_10000',  '万分大佬',    '单局得分超过10000',      '👑', 'score',     '{"type":"score_threshold","value":10000}', 80, 'rare'),
  ('streak_7',     '七日修行',    '连续登录7天',            '🔥', 'streak',    '{"type":"streak","value":7}',             40, 'uncommon'),
  ('streak_30',    '月度修行者',  '连续登录30天',           '💎', 'streak',    '{"type":"streak","value":30}',            100, 'epic'),
  ('all_games',    '全制霸',      '玩过所有游戏各至少一次',  '🌟', 'general',   '{"type":"play_all_games","value":4}',     60, 'rare'),
  ('legend',       '修仙传奇',    '总得分超过100000',       '🐉', 'score',     '{"type":"total_score","value":100000}',  200, 'legendary');

-- 11. 游戏评论表
CREATE TABLE IF NOT EXISTS game_reviews (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    game_id         INT UNSIGNED NOT NULL,
    content         TEXT         NOT NULL COMMENT '评论内容',
    rating          TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '评分 1-5',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_created (game_id, created_at),
    INDEX idx_user_game (user_id, game_id)
) ENGINE=InnoDB COMMENT='游戏评论';
