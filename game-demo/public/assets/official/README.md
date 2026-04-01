# 官方素材落位说明（王者元素）

将你从王者荣耀官方页面整理的素材放到本目录，文件名必须与下方一致：

- `shouyue.png`：百里守约角色立绘/半身贴图（建议透明背景）
- `mozhong.png`：魔种敌人贴图（建议透明背景）
- `supply_box.png`：长城外补给箱贴图
- `npc_mulan.png`：花木兰贴图
- `npc_kai.png`：铠贴图
- `npc_xuance.png`：百里玄策贴图
- `desert_bg.png`：长城外沙漠背景图（可选）

当前代码会优先使用这些贴图：

- `official_shouyue` <- `/assets/official/shouyue.png`
- `official_mozhong` <- `/assets/official/mozhong.png`
- `official_supply_box` <- `/assets/official/supply_box.png`
- `official_npc_mulan` <- `/assets/official/npc_mulan.png`
- `official_npc_kai` <- `/assets/official/npc_kai.png`
- `official_npc_xuance` <- `/assets/official/npc_xuance.png`
- `official_desert_bg` <- `/assets/official/desert_bg.png`（可选）

如果文件缺失，系统会自动回退到程序化模型，不会阻塞运行。
