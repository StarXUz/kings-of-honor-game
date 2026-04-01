# 王者荣耀·长城试炼：百里守约 AI 战术训练系统

本仓库用于全国服务外包创新创业大赛 D05 赛道项目开发与答辩准备。

## 目录结构

- `game-demo/`：Phaser 3 + TypeScript 网页 Demo
- `00_项目总览.md` ~ `15_Rider运行环境配置清单.md`：项目文档与答辩材料

## 跨平台快速运行（macOS / Windows）

### 1) 安装 Node.js

- 推荐 Node.js LTS（20.x 或更高）
- Windows 与 macOS 都可直接使用官方安装包

### 2) 下载后启动

```bash
cd game-demo
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 构建与检查

```bash
cd game-demo
npm run check
npm run build
```

## 环境变量

- 请复制 `game-demo/.env.example` 为本地环境文件使用
- 本仓库不会上传本机环境配置（`.env*`、IDE 配置、`node_modules`、`dist` 等）

## 分支策略

- `main`：稳定版本（演示与答辩基线）
- `develop`：日常开发迭代分支
