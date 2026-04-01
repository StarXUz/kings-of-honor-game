# Rider 运行环境配置清单（game-demo）

## 1. 项目路径
`/Users/xujunming/Desktop/KingHonor_GreatWall_AI_Training_Project/game-demo`

## 2. Node 版本要求
- 推荐版本：`v24.14.1`
- 版本锁定文件：`game-demo/.nvmrc`

在终端先执行：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
node -v
npm -v
```

## 3. 第一次安装依赖
```bash
cd /Users/xujunming/Desktop/KingHonor_GreatWall_AI_Training_Project/game-demo
npm install
```

## 4. Rider 中配置 Node 解释器
1. 打开 Rider -> `Settings` -> `Languages & Frameworks` -> `Node.js`
2. Node interpreter 选择：
`/Users/xujunming/.nvm/versions/node/v24.14.1/bin/node`
3. Package manager 选择同版本 npm（自动识别或手动指定）

## 5. Rider 中创建运行配置
1. 右上角 `Run/Debug Configurations`
2. 新建 `npm`
3. 参数设置：
- `package.json`：`/Users/xujunming/Desktop/KingHonor_GreatWall_AI_Training_Project/game-demo/package.json`
- `Command`：`run`
- `Scripts`：`dev`
4. Working directory：
`/Users/xujunming/Desktop/KingHonor_GreatWall_AI_Training_Project/game-demo`
5. 保存后点击运行

## 6. 常用脚本
在 `game-demo/package.json` 中已配置：
- `npm run dev`：开发模式（固定端口 5173）
- `npm run dev:local`：本地回环模式
- `npm run check`：TypeScript 类型检查
- `npm run build`：生产构建
- `npm run preview`：构建结果预览

## 7. 环境变量说明
已配置：
- `game-demo/.env.development`
- `game-demo/.env.production`

字段说明：
- `VITE_APP_TITLE`：应用标题
- `VITE_API_MODE`：`mock` 或 `live`
- `VITE_API_BASE`：AI 接口基础路径

## 8. 启动验证标准
1. 运行 `npm run dev` 后无报错
2. 浏览器打开 `http://localhost:5173`
3. 游戏画面成功出现，角色可移动

## 9. 你当前最短执行路径
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /Users/xujunming/Desktop/KingHonor_GreatWall_AI_Training_Project/game-demo
nvm use
npm run dev
```
