# cutcat MVP 设计文档

- **日期**: 2026-06-27
- **阶段**: Phase 1 — MVP
- **状态**: 已确认，待写实现计划

---

## 1. 产品定义

cutcat 是一款**现实宠物卡牌收集微信小程序**。用户在现实世界中拍摄遇到的猫猫，小程序通过 AI 生成一张独一无二的猫猫卡片，记录捕捉时间、地点、外观特征、稀有度和等级。用户建立自己的城市猫猫图鉴，通过道具、会员形成长期收集玩法。

### 核心玩法循环（MVP）

```
遇到猫猫 → 拍照 → 使用捕捉球 → AI 识别并生卡 → 卡片入图鉴 → 等待道具恢复继续捕捉
```

> 每次拍到真实宠物，都应该让用户有"开盲盒"的感觉。拍照之后系统生成一张"有命运感"的卡。

### 分阶段路线

- **Phase 1（本次）— MVP**：拍猫 → AI 识别 → 生成卡 → 稀有度 → 时间/地点记录 → 图鉴 → 道具消耗 + 自然恢复 → 会员加成
- **Phase 2**：展示 / 交换 / 赠送（社交）；同一只猫"再次相遇"养成
- **Phase 3**：交易市场（涉及合规、风控，最后做）

本文档只设计 Phase 1。Phase 2/3 仅在数据层留接口占位，不实现。

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 | **原生微信小程序 + TypeScript** | MVP 阶段最快、最稳，无构建步骤，API 调用直接 |
| 后端 | **微信云开发（CloudBase）** | 免运维、免备案域名、自带数据库/存储/云函数，与小程序鉴权统一 |
| AI | **微信 AI 能力为主**（图像识别 + 多模态生文案/卡面） | 与云开发同一体系，鉴权最顺，计费统一 |

**关键约束**：AI Key 只存在于云函数环境变量，前端永远拿不到。

---

## 3. 项目结构（monorepo）

```
cutcat/
├── miniprogram/          # 小程序前端（原生 TS）
│   ├── app.ts / app.json / app.wxss
│   ├── pages/            # catch / dex / profile / card-detail
│   ├── components/       # 卡片、稀有度徽章、捕捉动画
│   ├── services/         # 封装云函数调用（cloud.ts）
│   ├── utils/            # 工具函数
│   ├── types/            # TS 类型定义（与后端共享）
│   └── images/           # 静态资源
├── cloudfunctions/       # 云函数（后端逻辑，存放 AI Key）
│   ├── login/
│   ├── recoverBalls/
│   ├── catchPet/         # 核心：校验道具→AI识别→生卡→扣道具→写库
│   ├── genCardArt/       # 重新生成卡面（消耗道具）
│   ├── getDex/
│   ├── getCardDetail/
│   └── getProfile/
├── docs/                 # 设计文档
├── .gitignore
├── README.md
└── project.config.json   # 小程序项目配置（含云开发环境）
```

---

## 4. 数据模型

云数据库集合（NoSQL 文档库）。MVP 共 4 个集合（`balls_recovery` 留待 Phase 2）。

### 4.1 `users` — 用户

```js
{
  _id, openid,                    // 微信 openid 为主键
  nickname, avatar,
  balls: 3,                       // 当前捕捉球数量
  ballsMax: 3,                    // 道具上限（会员可加到 10）
  ballsRecoveredAt: Date,         // 上次恢复时间，用于算自然恢复（懒计算基准）
  membership: { level, expireAt } // 会员：null 或 { level:'vip', expireAt }
  totalCaught: 0,                 // 统计
  createdAt, updatedAt
}
```

### 4.2 `cards` — 卡片（核心资产）

```js
{
  _id, ownerOpenid,
  cardNo,                         // 卡片编号（全局递增，如 #000123）
  name,                           // AI 生成卡名，如「巷口橘影」
  rarity,                         // N / R / SR / SSR / UR
  level: 1,                       // 等级（养成，MVP 初始 1，Phase 2 可提升）
  petType,                        // cat / dog / other
  furColor,                       // 橘猫/三花/奶牛/黑猫/白猫...
  traits: [],                     // 性格标签：警觉、慵懒、亲人...
  originPhoto: fileID,            // 用户拍的原始照片
  artPhoto: fileID,               // AI 生成的卡面图
  desc,                           // AI 生成的一句描述
  caughtAt, caughtLocation: {     // 捕捉记录
    lat, lng, city, district,     // 精确坐标（仅本人可见）
    publicArea                    // 对外只展示区域级，保护流浪猫位置
  },
  isPublic: true,                 // 是否进入公开图鉴/可被发现
  createdAt
}
```

### 4.3 `catches_log` — 捕捉流水（成本/风控审计）

```js
{
  _id, openid, fileID, location,
  aiCostEstimate,                 // 内部成本估算（¥/次）
  result: 'card' | 'reject' | 'dup',  // 成卡/拒绝/重复
  rarity, consumedBall: true,
  createdAt
}
```

### 4.4 `balls_recovery` — 道具恢复记录（Phase 2）

**MVP 阶段不创建此集合。** 恢复算法仅依赖 `users.ballsRecoveredAt` 字段懒计算（见 5.4）。此集合为 Phase 2 的恢复审计/防作弊分析预留，MVP 不实现。

### 4.5 `config` — 全局配置（云函数读取，不写死）

```js
{ key:'recovery_interval_hours', value:4 },   // 免费用户恢复间隔
{ key:'recovery_speed_vip_hours', value:2 },  // 会员恢复间隔
{ key:'free_balls_max', value:3 },
{ key:'vip_balls_max', value:10 },
{ key:'rarity_weights', value:{...} },        // 稀有度规则引擎权重
{ key:'rarity_thresholds', value:{...} }      // 稀有度等级阈值
```

### 设计要点

- **地点隐私**：`caughtLocation` 同时存精确坐标（仅本人）和 `publicArea`（对外展示），从数据层隔离流浪猫位置风险。
- **成本可追溯**：`catches_log` 每条记 `aiCostEstimate`，将来算 ROI、调定价都靠它。
- **配置外置**：恢复速度、上限、稀有度权重/阈值都放 `config`，改数值不用发版。
- **重复识别占位**：`catches_log.result:'dup'` 为 Phase 2"同一只猫再次相遇"留接口，MVP 先不实现去重逻辑。

---

## 5. 核心云函数

### 5.1 云函数清单

| 云函数 | 职责 | 消耗道具 |
|---|---|---|
| `login` | 换 openid，首次登录初始化 users 文档 | 否 |
| `recoverBalls` | 登录/进首页时调用，补发自然恢复的球 | 否 |
| `catchPet` | 核心：校验道具→AI 识别→生卡→扣道具→写库 | **是（1个）** |
| `genCardArt` | 重新生成 AI 卡面/文案（消耗道具） | **是** |
| `getDex` | 分页拉取用户图鉴（按时间/稀有度排序） | 否 |
| `getCardDetail` | 卡片详情 | 否 |
| `getProfile` | 我的：道具余额、会员、统计 | 否 |

### 5.2 `catchPet` 执行流程（原子事务）

```
1. 读 users → 校验 balls > 0          ← 防超扣
2. 读 config → 拿规则参数
3. 调微信 AI 图像识别 → 是否猫/品种/毛色
   ├─ 非宠物/网图/低质 → result:'reject'，不扣球（友好失败）
   └─ 通过 → 继续
4. 调微信 AI 多模态 → 生成卡名 + 文案 + 风格描述
5. 规则引擎算稀有度（见 5.3）
6. 写 cards（拿到 _id）
7. 更新 users: balls - 1, totalCaught + 1   ← 与步骤6同事务
8. 写 catches_log（成本审计）
9. 返回完整卡片数据
```

**原子性**：`catchPet` 对外是单个云函数，保证"扣道具→生卡"原子性，不会出现扣了球却没生卡的 bug。步骤 6（写 cards）与步骤 7（扣道具）须同事务，失败回滚。

**友好失败设计**：第 3 步 AI 判定非宠物/低质量时，**不扣球**只记 `reject`。避免用户被白白扣球流失。

### 5.3 稀有度规则引擎（非纯随机）

输入 5 个维度，加权打分映射到等级：

```
score = w1*特征分(异瞳/特殊毛色/姿态)        // 微信 AI 识别输出
      + w2*图片质量分(清晰度/构图/主体完整度)  // AI 评分
      + w3*地点分(首次发现该区域/远距离)
      + w4*时间分(夜晚/雨天/节日)
      + w5*AI综合分

score → 区间映射：N / R / SR / SSR / UR
```

权重 w1–w5 与各等级阈值都放 `config` 集合，可调平衡性而不发版。普通猫也要有价值，所以 N 档也带"图鉴价值/地点价值"展示（数据层已支持）。

| 稀有度 | 名称 | 定位 |
|---|---|---|
| N | 普通 | 大多数普通猫猫 |
| R | 稀有 | 特征比较明显 |
| SR | 超稀有 | 姿态、毛色、地点较特别 |
| SSR | 传说 | 非常罕见、照片质量高 |
| UR | 幻兽级 | 极少数，活动/特殊条件触发 |

### 5.4 道具恢复算法（免费配额阀门）

**懒计算**——不在后台定时器里跑，而是用户进首页时（调 `recoverBalls`）一次性补算：

```
recoverBalls(openid):
  u = 读 users
  max      = config[会员? 'vip_balls_max' : 'free_balls_max']        // 3 或 10
  interval = config[会员? 'recovery_speed_vip_hours' : 'recovery_interval_hours']  // 2 或 4
  elapsed  = now - u.ballsRecoveredAt       // 距上次恢复的时长
  recoverable = floor(elapsed / interval)   // 可补几个
  if recoverable == 0: return 当前余额
  newBalls = min(u.balls + recoverable, max)  // 不超过上限
  实际补了 = newBalls - u.balls
  更新 users: balls = newBalls,
              ballsRecoveredAt = ballsRecoveredAt + 实际补了 * interval
              (余数时长保留，不能直接设成 now，否则吞掉没补满的零头)
  返回 newBalls
```

**关键细节**：`ballsRecoveredAt` 必须用 `上次时间 + 实际补了*interval`，不能直接设成 `now`，否则会吞掉"恢复到一半"的余数时间，让用户吃亏。

### 5.5 会员加成（不破坏公平）

| 权益 | 免费用户 | 会员 |
|---|---|---|
| 道具上限 | 3 | 10 |
| 恢复速度 | 4h/个 | 2h/个 |
| 每月额外球 | 无 | 每月赠 |

会员**只给"玩得更久、收更多"，不给"更强卡"**——稀有度规则引擎对所有用户一视同仁，避免 pay to win。会员购买走微信支付，MVP 可先留接口不实装。

---

## 6. 前端页面与捕捉流程体验

### 6.1 页面结构（3 Tab + 详情页）

```
miniprogram/pages/
├── catch/        # Tab1 捕捉：相机入口 + 道具余额 + 恢复倒计时
├── dex/          # Tab2 图鉴：我的卡片网格，按时间/稀有度筛选排序
├── profile/      # Tab3 我的：道具、会员、统计、设置
└── card-detail/  # 非Tab：卡片大图 + 完整属性 + 地点
```

捕捉页是核心，3 个 Tab 满足 MVP 全闭环。

### 6.2 捕捉页交互

```
┌─────────────────────┐
│  🐱 捕捉    球×3   │  ← 顶栏：余额 + 恢复倒计时
├─────────────────────┤
│                     │
│   ┌───────────┐     │
│   │           │     │
│   │  取景框    │     │  ← 相机预览 / 或从相册选
│   │           │     │
│   └───────────┘     │
│                     │
│   ⚪ 捕捉球已就绪    │
│                     │
│   [  开始捕捉  ]    │  ← 主按钮（球=0 时禁用+引导）
│                     │
└─────────────────────┘
```

### 6.3 捕捉流程的仪式感（核心体验，7 步）

> 仪式感决定用户愿不愿意为下一只猫再打开 App。

```
1. 拍照/选图
   → chooseImage / camera 组件
2. 点击"开始捕捉"
   → loading: "正在识别猫猫气息……"     ← 营造期待，用游戏化文案而非"加载中"
3. 云函数 catchPet 执行（AI识别+生卡）
   → 期间播放"捕捉球"动画             ← 视觉张力
4. 返回结果分支：
   ├─ reject（非宠物/低质）:
   │    友好提示"没找到猫猫气息～"
   │    不扣球，引导重拍               ← 失败也温柔
   └─ 成功:
5.   卡片翻开动画（卡背→卡面，配光效）  ← 高潮，稀有度越高动画越华丽（UR 全屏光效）
6.   展示卡牌：
        卡名「巷口橘影」
        ★★★ SSR 传说
        📍 某区·某街  🕐 刚刚
        "AI 生成的一句描述"
7.   底部操作：[收藏] [分享] [重生成卡面*] [备注]
        * 重生成消耗道具，走 genCardArt 云函数
```

**关键体验点**：
- 第 2 步文案"正在识别猫猫气息……"而非"加载中"——用游戏化文案拉满期待感。
- 第 5 步翻卡动画是整个产品情绪最高点，是"命运感"的具象化。
- 失败温柔：reject 不扣球 + 引导重拍，避免用户第一次就流失。

### 6.4 图鉴页

- 卡片网格，默认按捕捉时间倒序，可切"按稀有度"
- 每张卡显示：卡面缩略图 + 稀有度徽章 + 卡名
- 点击进 `card-detail`：大图、完整属性、精确地点（仅本人可见精确坐标，对外仅区域）
- 稀有度徽章配色：N 灰 / R 蓝 / SR 紫 / SSR 金 / UR 彩虹动效

### 6.5 技术约束（小程序特定）

- **图片**：`wx.chooseMedia` 拍照/选图，`wx.cloud.uploadFile` 传云存储拿 fileID
- **位置**：`wx.getLocation`，需用户授权；用户拒绝也能捕捉，只是地点为空
- **云函数调用**：封装在 `services/cloud.ts`，统一错误处理
- **TS 类型**：`types/` 下定义 Card / User 等接口，前后端共享类型

---

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| 用户上传非宠物/网图 | AI 识别校验，非宠物 reject 不扣球 |
| 重复刷同一只猫 | MVP 不去重；`catches_log.result:'dup'` 留接口，Phase 2 做"再次相遇"养成 |
| 地点隐私（流浪猫位置泄露） | 数据层分离精确坐标 vs publicArea，对外仅区域 |
| 动物安全 | 捕捉逻辑强调远距离拍摄、不接触/不打扰、不进私人区域（引导文案） |
| AI 成本失控 | 从第一天起每次捕捉消耗 1 球；道具懒恢复封顶；`catches_log` 记成本 |

---

## 8. MVP 明确不做

- ❌ 交易市场（Phase 3）
- ❌ 社交交换/赠送（Phase 2）
- ❌ 复杂养成/等级提升逻辑（Phase 2，MVP 卡片 level 固定 1）
- ❌ 地图社交/附近的人（Phase 2）
- ❌ 同一只猫去重/再次相遇（Phase 2）
- ❌ 会员支付实装（MVP 留接口）

---

## 9. 验收标准

MVP 完成即可发布灰度内测。以下全部满足视为 Phase 1 达标：

1. 用户能完成"拍照 → 生成卡片 → 卡片出现在图鉴"完整闭环。
2. 捕捉球消耗正确：成功捕捉扣 1 球；AI 判定非宠物不扣球。
3. 道具恢复：离线 N 小时后重进首页，球按懒恢复算法正确补发，余数时间不丢失。
4. 稀有度由规则引擎计算，N/R/SR/SSR/UR 五档均可出现（用样图验证分布）。
5. 卡片正确记录卡名、稀有度、时间、地点（精确坐标仅本人，对外仅区域）。
6. 3 个 Tab + 详情页可正常浏览，翻卡动画在生卡后播放。
7. AI Key 不出现在前端代码中。
8. `catches_log` 每次捕捉都有记录，含成本估算。
