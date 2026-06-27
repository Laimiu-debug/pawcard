# 图生图 API 接入指引（阿里通义万相）

> art-provider 已接好真实 API（替换 mock）。本文档是**你需完成的配置 + 验证**。
> 模型：**阿里通义万相 wan2.7-imageedit**（图生图，保住"还是用户拍的那只猫"）。

## 为什么是万相不是智谱

调研结论：智谱 CogView-4 / GLM-Image **都是纯文生图，不支持图生图**——只能"给描述生成一张猫"，不是用户拍的那只猫，违背 pawcard 产品核心。
万相明确支持图生图（拿原图 + 提示词重绘），是国内云 API 里最符合需求的选择。

## 接入流程

### 1. 开通阿里云百炼 + 拿 API Key

1. 登录 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 开通"模型服务灵积 DashScope"
3. 顶部「API-KEY 管理」→ 创建 → 复制 Key（形如 `sk-xxxxxxxx`）

### 2. 在微信云函数配置环境变量

每个用到图生图的云函数（`genCardArtTask`、`genCardArt`）都要配：

微信开发者工具 → 云开发 → 云函数 → 选函数 → 「配置」/「版本与配置」→ 环境变量：
- `DASHSCOPE_API_KEY` = `你的sk-key`

> 配了 Key，art-provider 自动走真实万相 API；不配则 mock 兜底（返回原图）。

### 3. 重新上传这两个云函数

配置好环境变量后，右键 `genCardArtTask` / `genCardArt` → 「上传并部署：云端安装依赖」。

### 4. 计费提醒

万相图生图约 ¥0.16–0.2/张。pawcard 的道具系统正是用来覆盖此成本（每次捕捉消耗 1 球）。建议在百炼控制台设**消费告警**，防异常调用烧钱。

## 技术细节（已实现，供参考）

art-provider 流程：
```
fileID(原图)
  → cloud.getTempFileURL → 临时下载URL（万相需公网URL）
  → 万相 wan2.7-imageedit（image=原图URL + text=卡牌风格prompt）
  → 结果图临时URL（24h有效）
  → fetch 下载 → cloud.uploadFile → 永久 fileID
  → 写回 card.artPhoto
```

提示词按稀有度分级（N 简洁 / SSR 金光粒子 / UR 全屏彩虹爆裂），并强调"保留这只猫的外观、毛色、姿态特征"——这是保住专属感的关键。

## 验证

1. 配好 Key 后，在 catchPet 捕捉一张真实猫图
2. 等待 getCardDetail 轮询触发 genCardArtTask（约 3s 后）
3. 查卡片 artPhoto：应从原图变成**卡牌风格重绘图，但仍能认出是同一只猫**
4. 失败排查：看 genCardArtTask 云函数日志（云开发控制台 → 云函数 → 日志）

## 后期增强（不在 MVP）

- **ControlNet 锁轮廓**：国内云 API 暂无公开 ControlNet。若要更强的猫一致性（精确轮廓/姿态），后期可自建 Stable Diffusion + ControlNet 服务器替换 art-provider，接口签名不变。
- **真实质量评分**：万相不返回质量分，当前固定 0.8。后期可接独立图像评分模型实现 genCardArtTask 的自动重试。
