# 联调与验收清单（Task 19）

> 代码已全部就绪并提交。本清单是**你需要操作的验证步骤**——部分只能在云函数部署后、Cocos 构建后、真机预览时执行。
> 对照 spec `docs/superpowers/specs/2026-06-27-pawcard-mvp-design.md` 第 9 节验收标准。

## ✅ 已自动验证（命令行）

- [x] 单测全绿：`npm test` → 11 PASS（道具恢复 5 + 稀有度引擎 6）
- [x] 结构齐全：shared 4 模块、8 云函数、16 前端脚本
- [x] AI Key 不在前端：`art-provider.ts` 读环境变量，前端 `assets/scripts/` 无任何密钥

## 📋 你需操作的验证（按顺序）

### A. 云函数部署（微信开发者工具）

1. 按 `docs/setup/01-cloud-db-init.md` 初始化数据库 5 集合 + config 数据
2. 对 8 个云函数逐一右键「上传并部署：云端安装依赖」：
   `login` `recoverBalls` `getProfile` `catchPet` `genCardArtTask` `genCardArt` `getDex` `getCardDetail`
3. **验证（spec 验收 #2 #9）**：
   - 调 `login` → 返回 `{ok:true,user:{balls:3}}`，users 集合 +1 条
   - 上传一张猫图得 fileID，调 `catchPet({fileID})` → 返回骨架卡（artStatus:'pending'），users.balls-1，cards +1，catches_log +1 条含 aiCostEstimate
   - 上传一张非猫图调 catchPet → `{result:'reject'}`，**balls 不变**（友好失败）
   - 调 `getCardDetail({cardId})` 触发重绘 → artStatus 变 done（mock 下 artPhoto=原图）

### B. 道具恢复验证（spec 验收 #3）

1. 在 users 集合把某用户的 `ballsRecoveredAt` 改成 5 小时前、`balls` 设 0
2. 调 `recoverBalls` → balls 应 +1（=1），`ballsRecoveredAt` 前进 4h（保留 1h 余数，**不是 now**）

### C. 稀有度分布（spec 验收 #4）

- 连续传多张猫图调 catchPet，观察返回卡 rarity 出现 N/R/SR/SSR/UR 多档（mock 下分数随机，分布合理即可）

### D. 地点隐私（spec 验收 #7）

- 本人调 getCardDetail → caughtLocation 含完整 lat/lng
- 模拟他人（改 openid）调 → 仅返回 `{publicArea}`

### E. Cocos 构建 + 真机（spec 验收 #1 #5 #6）

1. 按 `docs/setup/02-cocos-scene-setup.md` 搭场景、挂组件、配粒子
2. 编辑器 → 构建发布 → 微信小游戏（AppID wx5f2be181d74900e1）→ 构建
3. 微信开发者工具打开 `build/wechatgame/`，配置云环境 cloudbase-d0gm6j7hqbc346db6
4. 真机扫码预览，验证：
   - **完整闭环**：拍照 → 翻卡(原图) → 卡面升级(AI重绘) → 图鉴可见
   - **AI 重绘一致性**：生成卡仍能辨认出原猫（ControlNet 生效；mock 下暂=原图，接真实 API 后验证）
   - **动画炫酷**：翻卡 3D 翻转 + SSR/UR 粒子光效显著

## 🔌 接真实 AI（后续）

MVP 默认 mock（art-provider 无环境变量时直接返回原图）。接真实图生图时：
1. 在云函数环境变量配置 `ART_API_URL` 和 `ART_API_KEY`
2. 真实 API 需支持 img2img + controlnet(canny)，返回 `image_file_id` 和 `quality_score`
3. 重新上传 `genCardArtTask` 和 `genCardArt` 云函数
4. 按云函数运行时 Node 版本，确认 `fetch` 可用（Node 18+ 内置；旧版需加 axios 依赖）

## 版本标记

全部验证通过后：
```bash
git tag -a v0.1.0-mvp -m "pawcard MVP 完成"
```
