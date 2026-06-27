# pawcard MVP 设计文档（微信小游戏版）

- **日期**: 2026-06-27
- **阶段**: Phase 1 — MVP
- **状态**: 已确认，待写实现计划
- **更名说明**: 项目原名 cutcat，因改为微信小游戏方向而更名为 **pawcard**

---

## 1. 产品定义

pawcard 是一款**现实宠物卡牌收集微信小游戏**。用户拍摄现实中遇到的猫猫，通过 AI 把照片**重绘成专属卡牌插画**（锁住猫的轮廓/姿态，只换画风，保证"还是那只猫"），记录捕捉时间、地点、稀有度。用户建立城市猫猫图鉴，通过道具、会员形成长期收集玩法。

### 核心玩法循环（MVP）

```
遇到猫猫 → 拍照 → 使用捕捉球 → AI 识别 + 重绘卡牌 → 卡片入图鉴 → 等待道具恢复
```

> 每张卡都是"那只特定的猫"的专属命运卡——这是产品情感核心，也是 AI 重绘必须用 ControlNet 锁轮廓的原因。

### 分阶段路线

- **Phase 1（本次）— MVP**：拍猫 → AI 识别 → 重绘卡牌 → 稀有度 → 时间/地点 → 图鉴 → 道具消耗 + 自然恢复 → 会员加成
- **Phase 2**：社交展示/交换/赠送；同一只猫"再次相遇"养成
- **Phase 3**：交易市场（合规/风控，最后做）

本文档只设计 Phase 1。Phase 2/3 仅在数据层留接口占位。

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 游戏引擎 | **Cocos Creator 3.8 LTS + TypeScript** | 卡牌翻转/粒子光效主场，动画炫酷；可视化编辑 |
| 发布平台 | **微信小游戏**（AppID `wx5f2be181d74900e1`） | 用户注册的是小游戏号；卡牌/动画体验是卖点 |
| 后端 | **微信云开发**（云环境 `cloudbase-d0gm6j7hqbc346db6`） | 免运维、与小游戏鉴权统一 |
| AI 识别 | 微信 AI / 多模态大模型 | 判断是否猫、品种、毛色、质量评分 |
| **AI 重绘** | **云端图生图大模型 API + ControlNet** | 锁轮廓保证"还是那只猫"，画风换卡牌插画。Key 放云函数 |
| 纯逻辑测试 | Node + `node:test` | 稀有度规则引擎、道具恢复算法单测 |

**关键约束**：所有 AI Key 只存在于云函数环境变量，前端永远拿不到。

---

## 3. 项目结构

```
pawcard/
├── assets/                    # Cocos 资源目录
│   ├── scripts/
│   │   ├── core/              # 入口、场景管理、事件总线、全局状态
│   │   ├── scenes/            # MainScene（多 Panel 切换）+ CardDetail（弹窗）
│   │   ├── panels/            # CatchPanel / DexPanel / ProfilePanel
│   │   ├── ui/                # CardView(卡牌) / RarityBadge / BallCounter / CatchAnim / CardFlipAnim
│   │   ├── services/          # CloudService(云函数封装) / WxService(拍照定位)
│   │   └── utils/             # 配色、时间格式化
│   ├── prefabs/               # 卡牌预制体、徽章预制体、捕捉弹窗预制体
│   ├── scenes/                # .scene 场景文件
│   ├── textures/              # 图集、UI 图、卡牌纹理
│   └── animations/            # 翻卡动画、稀有度光效粒子
├── cloudfunctions/            # 云函数（微信云开发，小游戏/小程序通用）
│   ├── login/
│   ├── recoverBalls/
│   ├── catchPet/              # 识别+算稀有度+写骨架卡+触发后台生图
│   ├── genCardArtTask/        # 后台：调图生图 API，写回 artPhoto
│   ├── genCardArt/            # 用户主动重生成卡面
│   ├── getDex/
│   ├── getCardDetail/         # 前端轮询用
│   └── getProfile/
├── shared/                    # 纯逻辑（前后端共享类型 + 算法）
│   ├── types.ts
│   ├── rarity-engine.ts
│   └── balls-recovery.ts
├── tests/                     # Node 单测
├── settings/                  # Cocos 项目设置
├── package.json               # 根：云函数依赖 + 单测
├── project.config.json        # 微信小游戏项目配置
└── docs/
```

---

## 4. 数据模型

微信云数据库（NoSQL）。MVP 共 4 个集合。

### 4.1 `users`

```js
{
  _id, openid,
  nickname, avatar,
  balls: 3,                     // 当前捕捉球
  ballsMax: 3,                  // 上限（会员可 10）
  ballsRecoveredAt: Date,       // 懒恢复基准时间
  membership: { level, expireAt } | null,
  totalCaught: 0,
  createdAt, updatedAt
}
```

### 4.2 `cards`

```js
{
  _id, ownerOpenid,
  cardNo,                       // 全局递增编号（事务内自增 counters.cardNo）
  name,                         // AI 生成卡名
  rarity,                       // N/R/SR/SSR/UR
  level: 1,                     // MVP 固定 1，Phase 2 养成
  petType,                      // cat/dog/other
  furColor,                     // 橘猫/三花/奶牛/黑猫/白猫...
  traits: [],
  originPhoto: fileID,          // 原始照片
  artPhoto: fileID,             // AI 重绘卡面（生图未完成前 = originPhoto 占位）
  artStatus: 'pending' | 'done' | 'failed',  // 重绘状态（前端轮询依据）
  desc,                         // AI 文案
  caughtAt, caughtLocation: { lat, lng, city, district, publicArea } | null,
  isPublic: true,
  createdAt
}
```

> **新增字段 `artStatus`**：异步重绘所需。`pending` 时前端显示占位（原图），`done` 时卡面"升级"为 AI 重绘图。

### 4.3 `catches_log` — 成本/风控审计

```js
{
  _id, openid, fileID, location,
  aiCostEstimate,               // 识别 + 重绘合计成本估算 ¥/次
  result: 'card' | 'reject' | 'dup',
  rarity, consumedBall,
  createdAt
}
```

### 4.4 `config` — 全局配置

```js
{ key:'recovery_interval_hours', value:4 },
{ key:'recovery_speed_vip_hours', value:2 },
{ key:'free_balls_max', value:3 },
{ key:'vip_balls_max', value:10 },
{ key:'rarity_weights', value:{ feature:30, quality:25, location:15, time:10, ai:20 } },
{ key:'rarity_thresholds', value:{ N:0, R:35, SR:55, SSR:75, UR:90 } },
{ key:'artgen_cost_per_card', value:0.2 }   // 重绘单次成本估算，用于 catches_log
```

### 设计要点

- **地点隐私**：精确坐标仅本人可见，对外仅 `publicArea`。
- **成本可追溯**：`catches_log` 每条记 `aiCostEstimate`（识别+重绘合计）。
- **配置外置**：所有可调数值放 `config`，改值不发版。
- **重复识别占位**：`result:'dup'` 为 Phase 2"再次相遇"留接口，MVP 不实现去重。

---

## 5. 核心云函数与异步重绘链路

### 5.1 云函数清单

| 云函数 | 职责 | 消耗道具 |
|---|---|---|
| `login` | 换 openid，首次初始化 users | 否 |
| `recoverBalls` | 进首页懒恢复道具 | 否 |
| `getProfile` | 我的：道具、会员、统计 | 否 |
| `catchPet` | **识别+算稀有度+写骨架卡(artStatus:pending)+触发生图+扣道具**。秒回 | **是（1个）** |
| `genCardArtTask` | 后台被 catchPet 触发：调图生图 API，写回 artPhoto，artStatus→done | 否（已扣） |
| `genCardArt` | 用户主动重生成卡面 | **是** |
| `getDex` | 分页图鉴 | 否 |
| `getCardDetail` | 卡片详情（**前端轮询 artStatus**） | 否 |

### 5.2 异步重绘链路（核心创新）

```
[前端] 拍照 → 上传云存储(fileID)
   → callFunction('catchPet', { fileID, location })
[catchPet]（秒回，避超时）
   1. 校验 balls > 0
   2. AI 识别（是否猫/毛色/质量分）
      ├─ 非宠物 → result:'reject'，不扣球，返回
      └─ 通过 → 继续
   3. 算稀有度（规则引擎）
   4. 写 cards：artPhoto=originPhoto, artStatus='pending'
   5. 事务内：扣道具 + totalCaught+1 + 编号自增 + 写 catches_log
   6. 异步触发 genCardArtTask（不等待）  ← 关键：后台跑生图
   7. 返回骨架卡（artStatus:'pending'）

> **异步触发实现**：微信云函数无法直接"调用并立即返回"另一个云函数。MVP 采用**轻量后台轮询**实现异步——catchPet 不等待 genCardArtTask；由 `genCardArtTask` 定时（云函数定时触发器）或前端首次轮询 getCardDetail 时懒触发。MVP 选用后者（懒触发）：getCardDetail 发现 `artStatus==='pending'` 且距 createdAt 超过一定时间未处理时，内部触发一次 genCardArtTask。这样无需配定时器，链路最简。
[前端] 立刻播翻卡动画（先看到原图占位）
   → 轮询 getCardDetail(cardId) 每 2s，直到 artStatus==='done'
   → 卡面"升级"动画（原图→AI重绘图）+ 稀有度光效
[genCardArtTask]（后台，catchPet 第6步触发）
   1. 取 card 的 originPhoto
   2. 调图生图 API（ControlNet 锁轮廓 + 卡牌风格提示词）
   3. 质量评分，过低自动重试一次
   4. 上传结果到云存储 → 写回 cards.artPhoto, artStatus='done'
   5. 失败 → artStatus='failed'，前端提示可手动重生成
```

**两次仪式感**：先翻出卡（拿到专属编号+稀有度+原图），再看卡面升级（原图变炫酷卡牌插画）。用户全程有反馈，不干等。

**友好失败**：catchPet 第2步判定非宠物/低质，**不扣球**只记 reject。

**质量兜底**：genCardArtTask 对生图结果做质量评分，过低自动重试一次；仍失败则 `artStatus:'failed'`，前端提示用户可手动"重生成卡面"（走 `genCardArt`，消耗道具）。

### 5.3 稀有度规则引擎（纯逻辑，单测覆盖）

```
score = (feature*30 + quality*25 + location*15 + time*10 + ai*20) / 100
score → N(<35) / R(35) / SR(55) / SSR(75) / UR(90)
```
权重与阈值放 `config`，可调。普通猫也有图鉴/地点价值，N 档不等于垃圾。

### 5.4 道具懒恢复算法（纯逻辑，单测覆盖）

```
elapsed = now - ballsRecoveredAt
recoverable = floor(elapsed / intervalMs)
newBalls = min(balls + recoverable, max)
实际补了 = newBalls - balls
newRecoveredAt = recoveredAt + 实际补了 * intervalMs   ← 余数保留，不设成 now
```
免费：上限3，4h/个。会员：上限10，2h/个。会员只给"玩更多"，稀有度一视同仁（不 pay to win）。

### 5.5 AI 重绘技术细节（图生图 + ControlNet）

- **输入**：originPhoto（猫的原始照片）
- **控制**：ControlNet 提取猫的**轮廓/姿态/深度**（Canny/Depth/Reference 任选），锁住"这只猫"的辨识度
- **提示词**：`{毛色} 猫，{姿态}，TCG卡牌插画风格，{稀有度对应华丽度}，高细节，居中构图`
  - 稀有度越高，提示词华丽度越强（UR：传说级光效、史诗构图）
- **输出**：卡牌插画图，上传云存储得新 fileID
- **成本/耗时**：约 ¥0.1–0.3/次，3–15s。云函数异步避开超时
- **MVP 接入策略**：`genCardArtTask` 内部封装为可替换的 `artProvider`，先接真实云端 API；若暂未拿到模型权限，提供 mock（直接用原图+滤镜）兜底，保证链路可跑

---

## 6. 前端架构（Cocos Creator）

### 6.1 场景与 Panel 方案

- **单 MainScene**：承载底部 Tab（捕获/图鉴/我的），三个 Panel 切换。状态不丢，切换快。
- **CardDetail 弹窗**（Prefab 弹层）：从图鉴点击进入，非独立场景。
- **LoginScene**：极简启动场景，调 login 后切 MainScene。

### 6.2 UI 组件（全 Cocos 节点自绘，无 WXML）

| 组件 | 职责 |
|---|---|
| `CardView` | 卡牌：卡面 Sprite + 边框(稀有度配色) + 信息区 |
| `RarityBadge` | 稀有度徽章：N灰/R蓝/SR紫/SSR金/UR彩虹 |
| `BallCounter` | 顶部道具计数 + 恢复倒计时 |
| `CatchAnim` | 捕捉中：球旋转 + "识别猫猫气息"文案 |
| `CardFlipAnim` | 卡牌翻转（3D rotation，卡背→卡面）|
| `RarityBurst` | 稀有度光效粒子（SSR金粒子/UR全屏彩虹爆裂+震屏）|

### 6.3 捕捉流程的仪式感（两次高潮）

```
1. 拍照（wx.chooseImage）/ 选图
2. 点"开始捕捉" → BallCounter -1 动画
3. CatchAnim：球旋转 + "正在识别猫猫气息……"
4. catchPet 返回：
   ├─ reject → 温柔提示"没找到猫猫气息～"，不扣球，引导重拍
   └─ 骨架卡 → 第5步
5. 【高潮1】CardFlipAnim 翻卡（先看到原图占位）+ RarityBurst 光效
6. 显示卡名/稀有度/地点 + "卡面生成中…"提示
7. 轮询 artStatus：done 时
8. 【高潮2】卡面"升级"动画（原图→AI重绘炫酷卡）+ 二次光效
9. 操作：[收藏] [分享] [重生成卡面*]
   * 走 genCardArt（消耗道具）
```

### 6.4 图鉴 / 我的 / 详情

- **图鉴**：网格（Cocos GridLayout 或手动排列），按时间/稀有度排序，稀有度越高卡牌边框越华丽
- **我的**：道具余额(x/max)、收集数、会员状态（占位）
- **详情**：大图、完整属性、地点（本人精确/对外区域）、重生成卡面

### 6.5 微信小游戏 API 约束

- 拍照/选图：`wx.chooseImage`（小游戏支持）
- 上传：`wx.cloud.uploadFile`
- 定位：`wx.getLocation`（授权；拒绝也能捕捉，地点为空）
- 云函数：`wx.cloud.callFunction`（Cocos 小游戏环境支持 wx.cloud）
- 分享：`wx.shareAppMessage`（MVP 可占位）

---

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| AI 重绘"不是那只猫"（一致性差） | **ControlNet 锁轮廓**；多模型方案备选 |
| 生图质量不稳（出烂图） | genCardArtTask 质量评分+自动重试；用户可手动重生成 |
| 生图超时/失败 | 异步链路避开超时；artStatus:'failed' 兜底 + 手动重生成出口 |
| 用户传非宠物/网图 | 识别校验，reject 不扣球 |
| 重复刷同一只猫 | MVP 不去重；`result:'dup'` 留接口，Phase 2 做 |
| 地点隐私（流浪猫位置） | 精确坐标 vs publicArea 数据层隔离 |
| 动物安全 | 引导文案强调远拍/不打扰/不进私域 |
| AI 成本失控 | 每次捕捉消耗 1 球；道具懒恢复封顶；catches_log 记成本 |

---

## 8. MVP 明确不做

- ❌ 交易市场（Phase 3）
- ❌ 社交交换/赠送（Phase 2）
- ❌ 复杂养成/等级提升（Phase 2，MVP level 固定 1）
- ❌ 同一只猫去重/再次相遇（Phase 2）
- ❌ 会员支付实装（MVP 留接口）
- ❌ 自建 SD/ControlNet 服务器（MVP 用云端 API，后期再考虑自建）

---

## 9. 验收标准

MVP 完成即可灰度内测。以下全部满足视为 Phase 1 达标：

1. 完整闭环：拍照 → 重绘卡牌（artStatus pending→done）→ 卡片出现在图鉴。
2. 捕捉球消耗正确：成功扣 1 球；AI 判定非宠物不扣球。
3. 道具恢复：离线 N 小时后重进，球按懒恢复算法正确补发，余数时间不丢失。
4. 稀有度由规则引擎计算，N/R/SR/SSR/UR 五档均可出现。
5. **AI 重绘保一致性**：生成的卡牌仍能辨认出原照片中的猫（ControlNet 生效）。
6. 卡牌动画炫酷：翻卡、稀有度光效（至少 SSR/UR 有显著粒子特效）。
7. 卡片正确记录卡名、稀有度、时间、地点（精确坐标仅本人，对外仅区域）。
8. AI Key 不出现在前端代码中。
9. `catches_log` 每次捕捉都有记录，含成本估算。
10. 纯逻辑（稀有度引擎、道具恢复）单测全绿。
