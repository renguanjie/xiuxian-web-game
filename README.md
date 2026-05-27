# 修仙游戏平台

一个纯前端的 HTML5 游戏大厅。站点由 Vue 3 与 Vite 构建，包含 12 个可直接游玩的修仙主题小游戏，不需要后端服务、数据库或部署环境变量。

## 游戏列表

| 游戏 | 分类 |
| --- | --- |
| 修仙幸存者 | 幸存者 |
| 修仙塔防 | 塔防 |
| 修仙贪吃蛇 | 贪吃蛇 |
| 仙剑射击 | 射击 |
| 炼丹仙人 | 益智 |
| 飞升仙人 | 跳跃 |
| 仙兽进化 | 动作 |
| 锤墙仙人 | 益智 |
| 挖矿仙人 | 益智 |
| 愤怒仙兽 | 益智 |
| 炸弹仙人 | 益智 |
| 仙剑索敌 | 益智 |

## 本地运行

需要 Node.js 18 或更高版本。

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认地址为 [http://localhost:5103](http://localhost:5103)。

## 验证与构建

```bash
cd frontend
npm test
npm run build
npm run preview
```

`npm test` 检查 Vercel 仅发布静态前端、12 个游戏资源均已包含，以及平台层 API/认证/评论/排行模块已经移除。

## 项目结构

```text
PythonWebGameProject/
├── frontend/
│   ├── public/games/       # 12 个独立 HTML5 游戏运行资源
│   ├── src/data/games.ts   # 首页与详情页使用的静态游戏目录
│   ├── src/views/          # 游戏大厅与游戏播放页
│   └── tests/              # 静态发布回归测试
└── vercel.json             # Vercel 静态构建及 SPA 路由
```

## Vercel 部署

仓库根目录的 `vercel.json` 会仅构建 `frontend/`，并将游戏文件作为静态资产发布。连接 GitHub 仓库后直接部署即可，无需设置 `DATABASE_URL`、`SECRET_KEY` 或任何后端服务。

游戏内自带的本地最高纪录由浏览器保存，仅属于单个游戏体验，不会发送到服务器。
