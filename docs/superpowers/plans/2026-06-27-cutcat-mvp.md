# cutcat MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现现实宠物卡牌收集微信小程序的 MVP——拍猫 → AI 识别 → 生成稀有度卡片 → 入图鉴 → 道具消耗与自然恢复。

**Architecture:** 原生小程序(TS) 前端 + 微信云开发后端（云函数 + 云数据库 + 云存储）+ 微信 AI。前端封装云函数调用，后端用原子事务保证"扣道具→生卡"，纯逻辑（稀有度规则引擎、道具恢复算法）独立成模块并用 Node 单测覆盖。

**Tech Stack:** 微信小程序原生 + TypeScript、微信云开发、Node.js（云函数运行时与单测）、`ts-node`/`node:test`（纯逻辑单测）。

**前置条件（用户填入占位）：**
- 小程序 AppID：在 `project.config.json` 的 `appid` 字段填入
- 云开发环境 ID：在 `project.config.json` 的 `cloudfunctionRoot` 对应环境、及 `miniprogram/app.ts` 的 `wx.cloud.init({ env })` 填入

**验证现实约束：** 小程序与云函数的真机/模拟器验证需在**微信开发者工具**中完成。本计划中"运行验证"步骤写明预期产物与在开发者工具里如何验证。纯逻辑（Task 5、6）可在命令行用 `node --test` 直接跑。

---

## 文件结构总览

> 决定每个文件的职责与边界，后续任务按此分解。

### 前端 `miniprogram/`

| 文件 | 职责 |
|---|---|
| `app.ts` / `app.json` / `app.wxss` | 小程序入口、Tab 配置、全局样式、云开发初始化 |
| `project.config.json` / `project.private.config.json` | 项目配置（AppID、云函数根目录、环境 ID） |
| `sitemap.json` | 索引配置 |
| `tsconfig.json` | TS 编译配置（前端） |
| `types/index.ts` | 全局共享类型：`Card`、`User`、`Rarity`、`CatchResult` 等（前后端共享） |
| `utils/format.ts` | 时间/稀有度徽章等纯展示工具 |
| `services/cloud.ts` | 封装所有 `wx.cloud.callFunction` 调用，统一错误处理 |
| `pages/catch/*` | Tab1 捕捉页 |
| `pages/dex/*` | Tab2 图鉴页 |
| `pages/profile/*` | Tab3 我的页 |
| `pages/card-detail/*` | 卡片详情页 |
| `components/rarity-badge/*` | 稀有度徽章组件 |
| `components/card-flip/*` | 卡片翻开动画组件 |
| `components/catch-progress/*` | 捕捉进行中动画组件 |

### 后端 `cloudfunctions/`

每个云函数一个目录，含 `index.js`（入口）+ `package.json`。**纯逻辑抽到 `shared/` 供云函数和单测共用。**

| 文件 | 职责 |
|---|---|
| `shared/rarity-engine.ts`（源）→ `cloudfunctions/catchPet/rarity-engine.js`（拷贝） | 稀有度规则引擎：特征/质量/地点/时间/AI分 → N/R/SR/SSR/UR |
| `shared/balls-recovery.ts`（源）→ 各云函数按需拷贝 | 道具懒恢复算法：算 recoverable、更新 ballsRecoveredAt（保留余数） |
| `cloudfunctions/login/index.js` | 换 openid，首次登录初始化 users |
| `cloudfunctions/recoverBalls/index.js` | 道具懒恢复 |
| `cloudfunctions/getProfile/index.js` | 我的：道具、会员、统计 |
| `cloudfunctions/catchPet/index.js` | 核心：原子事务捕捉生卡 |
| `cloudfunctions/genCardArt/index.js` | 重新生成卡面 |
| `cloudfunctions/getDex/index.js` | 分页图鉴 |
| `cloudfunctions/getCardDetail/index.js` | 卡片详情 |
| `tests/rarity-engine.test.ts` | 规则引擎单测 |
| `tests/balls-recovery.test.ts` | 恢复算法单测 |

> **为什么纯逻辑要"源在 shared、拷贝进云函数"：** 微信云函数每个函数独立部署，不共享 node_modules 目录；而 `shared/` 在仓库根便于单测。Task 7 会用脚本把 `shared/*.ts` 编译并拷贝进 `catchPet/`。云函数运行时为 Node.js，上传时微信工具会把函数目录整体打包。

---

## 任务依赖关系

```
Task 1 (项目骨架) 
  → Task 2 (共享类型)
  → Task 3 (云函数脚手架 + DB 初始化)
  → Task 4 (login + getProfile 云函数)
  → Task 5 (道具恢复算法 + 单测) ──┐
  → Task 6 (稀有度规则引擎 + 单测) ─┤
  → Task 7 (recoverBalls 云函数) ←─┤
  → Task 8 (catchPet 云函数) ←─────┘
  → Task 9 (genCardArt 云函数)
  → Task 10 (getDex + getCardDetail 云函数)
  → Task 11 (前端 services/cloud.ts 封装)
  → Task 12 (rarity-badge 组件)
  → Task 13 (catch 页)
  → Task 14 (card-flip + catch-progress 组件)
  → Task 15 (dex 页)
  → Task 16 (card-detail 页)
  → Task 17 (profile 页)
  → Task 18 (联调 + 验收)
```

---

## Task 1: 项目骨架与配置

**Files:**
- Create: `miniprogram/app.ts`, `miniprogram/app.json`, `miniprogram/app.wxss`
- Create: `project.config.json`, `miniprogram/sitemap.json`, `miniprogram/tsconfig.json`
- Create: `miniprogram/project.config.json`（若工具需要）
- Modify: `.gitignore`（确保忽略 `miniprogram_npm/`、`project.private.config.json`）

- [ ] **Step 1: 创建小程序入口 `miniprogram/app.ts`**

```ts
// miniprogram/app.ts
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cutcat-prod', // TODO: 填入你的云开发环境 ID
      traceUser: true,
    });
  },
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
  },
});
```

- [ ] **Step 2: 创建 `miniprogram/app.json`（含 3 Tab）**

```json
{
  "pages": [
    "pages/catch/catch",
    "pages/dex/dex",
    "pages/profile/profile",
    "pages/card-detail/card-detail"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#1a1a2e",
    "navigationBarTitleText": "cutcat",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#0f0f1e"
  },
  "tabBar": {
    "color": "#888",
    "selectedColor": "#ffd166",
    "backgroundColor": "#1a1a2e",
    "list": [
      { "pagePath": "pages/catch/catch", "text": "捕捉" },
      { "pagePath": "pages/dex/dex", "text": "图鉴" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

- [ ] **Step 3: 创建 `miniprogram/app.wxss`（全局深色基调）**

```css
/* miniprogram/app.wxss */
page {
  background-color: #0f0f1e;
  color: #f0f0f0;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
}
.container { padding: 24rpx; }
```

- [ ] **Step 4: 创建 `project.config.json`**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "useCompilerPlugins": ["typescript"]
  },
  "appid": "touristappid",
  "projectname": "cutcat",
  "compileType": "miniprogram",
  "libVersion": "2.32.3"
}
```

> 把 `appid` 改为你的真实 AppID。云函数上传需在工具里"云开发"面板开通环境。

- [ ] **Step 5: 创建 `miniprogram/sitemap.json`**

```json
{ "desc": "关于本文件的更多信息，请参考文档 https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/sitemap.html", "rules": [{ "action": "allow", "page": "*" }] }
```

- [ ] **Step 6: 创建 `miniprogram/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "strict": true,
    "noImplicitAny": true,
    "experimentalDecorators": true,
    "outDir": "dist",
    "rootDir": ".",
    "lib": ["ES2018"],
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: 验证可在微信开发者工具打开**

打开微信开发者工具 → 导入项目 → 选 `E:\cutcat` → 填入真实 AppID。
Expected: 项目能编译打开，无报错；TabBar 显示「捕捉/图鉴/我的」（页面文件在后续 Task 创建，此时点击 Tab 会报缺页面，属正常）。

- [ ] **Step 8: Commit**

```bash
git add miniprogram/app.ts miniprogram/app.json miniprogram/app.wxss miniprogram/sitemap.json miniprogram/tsconfig.json project.config.json .gitignore
git commit -m "feat: 初始化小程序骨架与配置"
```

---

## Task 2: 共享类型定义

**Files:**
- Create: `miniprogram/types/index.ts`

前后端共享的类型契约。云函数是 JS，但保持类型注释一致。

- [ ] **Step 1: 写类型定义**

```ts
// miniprogram/types/index.ts

/** 稀有度等级 */
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

/** 宠物类型 */
export type PetType = 'cat' | 'dog' | 'other';

/** 捕捉地点 */
export interface CatchLocation {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  publicArea: string; // 对外展示的区域级
}

/** 卡片 */
export interface Card {
  _id: string;
  ownerOpenid: string;
  cardNo: number;
  name: string;
  rarity: Rarity;
  level: number;
  petType: PetType;
  furColor: string;
  traits: string[];
  originPhoto: string; // fileID
  artPhoto: string;    // fileID
  desc: string;
  caughtAt: number;    // timestamp ms
  caughtLocation: CatchLocation | null;
  isPublic: boolean;
  createdAt: number;
}

/** 用户文档 */
export interface UserDoc {
  _id: string;
  openid: string;
  nickname: string;
  avatar: string;
  balls: number;
  ballsMax: number;
  ballsRecoveredAt: number; // timestamp ms
  membership: { level: 'vip'; expireAt: number } | null;
  totalCaught: number;
  createdAt: number;
  updatedAt: number;
}

/** catchPet 返回结果 */
export type CatchResult =
  | { result: 'card'; card: Card }
  | { result: 'reject'; reason: string };

/** 稀有度规则引擎输入 */
export interface RarityInput {
  featureScore: number;   // 0-100，AI 识别的毛色/异瞳/姿态特征分
  qualityScore: number;   // 0-100，图片质量分
  locationScore: number;  // 0-100，地点分（首次区域/远距离）
  timeScore: number;      // 0-100，时间分（夜晚/雨天/节日）
  aiScore: number;        // 0-100，AI 综合分
}

/** 稀有度规则配置（存于 config 集合） */
export interface RarityConfig {
  weights: { feature: number; quality: number; location: number; time: number; ai: number };
  thresholds: { N: number; R: number; SR: number; SSR: number; UR: number }; // 分数下界
}

/** 道具恢复算法输入 */
export interface RecoveryInput {
  currentBalls: number;
  max: number;
  recoveredAt: number; // ms
  now: number;         // ms
  intervalMs: number;
}

/** 道具恢复算法输出 */
export interface RecoveryOutput {
  newBalls: number;
  newRecoveredAt: number; // 保留余数
  recovered: number;      // 实际补了几个
}
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/types/index.ts
git commit -m "feat: 共享类型定义 (Card/User/Rarity/恢复算法)"
```

---

## Task 3: 云函数脚手架与数据库初始化

**Files:**
- Create: `cloudfunctions/login/package.json`, `cloudfunctions/login/index.js`
- Create: 根 `tsconfig.shared.json`、`package.json`（根，用于单测）
- 初始化（手动/脚本）云数据库 4 个集合 + config 初始数据

- [ ] **Step 1: 创建根 `package.json`（管理单测依赖）**

```json
{
  "name": "cutcat",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test --import tsx tests/",
    "build:shared": "tsc -p tsconfig.shared.json"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0"
  }
}
```

- [ ] **Step 2: 创建根 `tsconfig.shared.json`（编译 shared 到云函数）**

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "strict": true,
    "outDir": "shared-dist",
    "rootDir": "shared",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["shared/**/*.ts"]
}
```

- [ ] **Step 3: 创建 `cloudfunctions/login/package.json`**

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 4: 创建 `cloudfunctions/login/index.js`（先放占位，Task 4 实现）**

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  // Task 4 实现
  return { todo: 'login' };
};
```

- [ ] **Step 5: 在微信开发者工具的云开发控制台初始化数据**

打开"云开发"面板 → 数据库，创建 4 个集合：`users`、`cards`、`catches_log`、`config`。

为 `config` 集合插入初始记录（用户可在控制台"导入"或逐条添加）：

```json
[
  { "key": "recovery_interval_hours", "value": 4 },
  { "key": "recovery_speed_vip_hours", "value": 2 },
  { "key": "free_balls_max", "value": 3 },
  { "key": "vip_balls_max", "value": 10 },
  { "key": "rarity_weights", "value": { "feature": 30, "quality": 25, "location": 15, "time": 10, "ai": 20 } },
  { "key": "rarity_thresholds", "value": { "N": 0, "R": 35, "SR": 55, "SSR": 75, "UR": 90 } }
]
```

为集合设置权限：`users`/`cards`/`catches_log` 设为"仅创建者可读写"；`config` 设为"所有用户可读"。

Expected: 控制台显示 4 个集合，config 有 6 条记录。

- [ ] **Step 6: 安装根依赖并验证 Node 环境**

```bash
cd E:/cutcat && npm install
```

Expected: 生成 `node_modules/`，无报错（已被 .gitignore 忽略）。

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.shared.json cloudfunctions/login/
git commit -m "feat: 云函数脚手架与单测基础设施"
```

---

## Task 4: login 与 getProfile 云函数

**Files:**
- Create: `cloudfunctions/login/index.js`（覆盖占位）
- Create: `cloudfunctions/getProfile/package.json`, `cloudfunctions/getProfile/index.js`

- [ ] **Step 1: 实现 `login`（换 openid + 首次初始化 users）**

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { ok: false, error: 'no-openid' };

  const now = Date.now();
  // 查是否已存在
  const existing = await db.collection('users').where({ openid }).limit(1).get();
  if (existing.data.length > 0) {
    return { ok: true, user: existing.data[0] };
  }
  // 首次：初始化
  const freeMax = (await db.collection('config').where({ key: 'free_balls_max' }).limit(1).get()).data[0]?.value || 3;
  const newUser = {
    openid,
    nickname: '',
    avatar: '',
    balls: freeMax,
    ballsMax: freeMax,
    ballsRecoveredAt: now,
    membership: null,
    totalCaught: 0,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection('users').add({ data: newUser });
  return { ok: true, user: { _id: res._id, ...newUser } };
};
```

- [ ] **Step 2: 创建 `getProfile`**

```js
// cloudfunctions/getProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  return { ok: true, user: u.data[0] };
};
```

`cloudfunctions/getProfile/package.json` 同 login（依赖 `wx-server-sdk`）。

- [ ] **Step 3: 在开发者工具中上传并测试云函数**

右键 `cloudfunctions/login` → "上传并部署：云端安装依赖"。对 `getProfile` 同样操作。
然后用"云开发"面板的"云函数"→"本地调试"或在前端控制台 `wx.cloud.callFunction({name:'login'})` 测试。
Expected: login 返回 `{ ok:true, user:{...} }`，users 集合多出一条记录，balls=3。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/login cloudfunctions/getProfile
git commit -m "feat: login 首次初始化 + getProfile 云函数"
```

---

## Task 5: 道具恢复算法（纯逻辑 + 单测）

**Files:**
- Create: `shared/balls-recovery.ts`
- Create: `tests/balls-recovery.test.ts`

这是成本控制的核心，**先写测试**。

- [ ] **Step 1: 写失败测试**

```ts
// tests/balls-recovery.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecovery } from '../shared/balls-recovery';

const HOUR = 3600 * 1000;

test('elapsed 不足一个 interval，不补发', () => {
  const out = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 3 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(out.recovered, 0);
  assert.equal(out.newBalls, 0);
  assert.equal(out.newRecoveredAt, 0); // 不变
});

test('刚好满一个 interval，补 1 个，余数 0', () => {
  const out = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 4 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(out.recovered, 1);
  assert.equal(out.newBalls, 1);
  assert.equal(out.newRecoveredAt, 4 * HOUR);
});

test('补发后余数时间保留，不被吞掉', () => {
  // 现在 9h，interval 4h → 可补 2 个（吃掉 8h），余 1h 必须保留
  const out = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 9 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(out.recovered, 2);
  assert.equal(out.newBalls, 2);
  assert.equal(out.newRecoveredAt, 8 * HOUR); // = 0 + 2*4h，保留余 1h
});

test('不超过上限', () => {
  // 已有 2 个，max 3，可补 5 个 → 实际只补 1 个到上限
  const out = computeRecovery({ currentBalls: 2, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(out.newBalls, 3);
  assert.equal(out.recovered, 1);
});

test('已满上限时不补发但 recoveredAt 仍前进', () => {
  const out = computeRecovery({ currentBalls: 3, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(out.newBalls, 3);
  assert.equal(out.recovered, 0);
  assert.equal(out.newRecoveredAt, 0); // 没补，不动（上限满时通常不前进；此为约定）
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd E:/cutcat && npx tsx --test tests/balls-recovery.test.ts`（或 `npm test`）
Expected: FAIL（模块不存在 / 导出未定义）。

- [ ] **Step 3: 实现算法**

```ts
// shared/balls-recovery.ts
import type { RecoveryInput, RecoveryOutput } from './types';

export function computeRecovery(input: RecoveryInput): RecoveryOutput {
  const { currentBalls, max, recoveredAt, now, intervalMs } = input;
  if (now <= recoveredAt || intervalMs <= 0) {
    return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  }
  const elapsed = now - recoveredAt;
  const recoverable = Math.floor(elapsed / intervalMs);
  if (recoverable <= 0) {
    return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  }
  // 已满上限：不补，不前进（约定）
  if (currentBalls >= max) {
    return { newBalls: max, newRecoveredAt: recoveredAt, recovered: 0 };
  }
  const newBalls = Math.min(currentBalls + recoverable, max);
  const recovered = newBalls - currentBalls;
  // 只前进"实际补的"数量对应的时长，余数保留
  const newRecoveredAt = recoveredAt + recovered * intervalMs;
  return { newBalls, newRecoveredAt, recovered };
}
```

> 注：`shared/types.ts` 在 Task 2 的类型之外再建一个仅含恢复/稀有度所需类型的小文件，或直接从 `miniprogram/types` 引用会触发路径问题。最干净的做法：在 `shared/` 下建 `shared/types.ts`，把 `RarityInput/RarityConfig/RecoveryInput/RecoveryOutput/Rarity` 复制到这里（云函数与前端类型各自维护，避免跨目录 import）。Task 6 也会用到。

先补建 `shared/types.ts`：

```ts
// shared/types.ts
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface RarityInput {
  featureScore: number;
  qualityScore: number;
  locationScore: number;
  timeScore: number;
  aiScore: number;
}

export interface RarityConfig {
  weights: { feature: number; quality: number; location: number; time: number; ai: number };
  thresholds: { N: number; R: number; SR: number; SSR: number; UR: number };
}

export interface RecoveryInput {
  currentBalls: number;
  max: number;
  recoveredAt: number;
  now: number;
  intervalMs: number;
}

export interface RecoveryOutput {
  newBalls: number;
  newRecoveredAt: number;
  recovered: number;
}
```

并把 `shared/balls-recovery.ts` 的 import 改为 `from './types'`。

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd E:/cutcat && npm test`
Expected: 5 个 test 全 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/ tests/balls-recovery.test.ts
git commit -m "feat(tdd): 道具懒恢复算法 + 5 个单测全绿"
```

---

## Task 6: 稀有度规则引擎（纯逻辑 + 单测）

**Files:**
- Create: `shared/rarity-engine.ts`
- Create: `tests/rarity-engine.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/rarity-engine.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRarity } from '../shared/rarity-engine';
import type { RarityConfig } from '../shared/types';

const config: RarityConfig = {
  weights: { feature: 30, quality: 25, location: 15, time: 10, ai: 20 },
  thresholds: { N: 0, R: 35, SR: 55, SSR: 75, UR: 90 },
};

test('全 0 分 → N', () => {
  assert.equal(computeRarity({ featureScore: 0, qualityScore: 0, locationScore: 0, timeScore: 0, aiScore: 0 }, config), 'N');
});

test('接近满分 → UR', () => {
  assert.equal(computeRarity({ featureScore: 100, qualityScore: 100, locationScore: 100, timeScore: 100, aiScore: 100 }, config), 'UR');
});

test('中等分约 50 → R', () => {
  // 50*各权重 → 0.5 加权后 50 → >= 35 (R) < 55 (SR)
  const r = computeRarity({ featureScore: 50, qualityScore: 50, locationScore: 50, timeScore: 50, aiScore: 50 }, config);
  assert.equal(r, 'R');
});

test('高分约 80 → SSR', () => {
  const r = computeRarity({ featureScore: 80, qualityScore: 80, locationScore: 80, timeScore: 80, aiScore: 80 }, config);
  assert.equal(r, 'SSR');
});

test('阈值为下界，恰好等于阈值落该档', () => {
  // score = 35 → R
  const r = computeRarity({ featureScore: 35, qualityScore: 35, locationScore: 35, timeScore: 35, aiScore: 35 }, config);
  assert.equal(r, 'R');
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd E:/cutcat && npm test`
Expected: FAIL（computeRarity 未定义）。

- [ ] **Step 3: 实现规则引擎**

```ts
// shared/rarity-engine.ts
import type { RarityInput, RarityConfig, Rarity } from './types';

/**
 * 加权打分后映射到稀有度。
 * score = Σ(维度分 * 权重/100)，结果 0-100。
 * 然后按 thresholds 从高到低判定（阈值为下界）。
 */
export function computeRarity(input: RarityInput, config: RarityConfig): Rarity {
  const { weights } = config;
  const score =
    (input.featureScore * weights.feature +
      input.qualityScore * weights.quality +
      input.locationScore * weights.location +
      input.timeScore * weights.time +
      input.aiScore * weights.ai) / 100;

  const t = config.thresholds;
  if (score >= t.UR) return 'UR';
  if (score >= t.SSR) return 'SSR';
  if (score >= t.SR) return 'SR';
  if (score >= t.R) return 'R';
  return 'N';
}

/** 默认配置，云函数读 config 集合失败时兜底。 */
export const DEFAULT_RARITY_CONFIG: RarityConfig = {
  weights: { feature: 30, quality: 25, location: 15, time: 10, ai: 20 },
  thresholds: { N: 0, R: 35, SR: 55, SSR: 75, UR: 90 },
};
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd E:/cutcat && npm test`
Expected: balls-recovery 5 + rarity-engine 5 = 10 个 test 全 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/rarity-engine.ts tests/rarity-engine.test.ts
git commit -m "feat(tdd): 稀有度规则引擎（加权评分→5档）+ 单测"
```

---

## Task 7: recoverBalls 云函数

**Files:**
- Create: `cloudfunctions/recoverBalls/package.json`, `cloudfunctions/recoverBalls/index.js`
- Create: 脚本 `scripts/sync-shared.js`（把 shared 编译产物拷进目标云函数）

- [ ] **Step 1: 创建同步脚本 `scripts/sync-shared.js`**

```js
// scripts/sync-shared.js
// 把 shared/*.ts 编译为 JS 并拷贝进指定云函数目录。
// 用法: node scripts/sync-shared.js catchPet recoverBalls
const fs = require('fs');
const path = require('path');

const SHARED_FILES = ['types.ts', 'balls-recovery.ts', 'rarity-engine.ts'];
const ROOT = path.resolve(__dirname, '..');

// 简易 TS→JS：因 shared 无复杂语法（仅 type/interface/function），用 tsx 运行时编译太重；
// 这里改为：读取 .ts，剔除 import type / interface / export type 行，写为 .js + .d.ts。
// 更稳妥：直接调用 tsc。下方用 tsc 单文件编译。
const { execSync } = require('child_process');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('用法: node scripts/sync-shared.js <cloudfn> [cloudfn...]');
  process.exit(1);
}

for (const fn of targets) {
  const dir = path.join(ROOT, 'cloudfunctions', fn);
  if (!fs.existsSync(dir)) { console.warn('跳过不存在的:', dir); continue; }
  for (const f of SHARED_FILES) {
    const src = path.join(ROOT, 'shared', f);
    if (!fs.existsSync(src)) continue;
    const outJs = path.join(dir, f.replace(/\.ts$/, '.js'));
    // 用 tsc 编译单文件为 JS（target ES2018, commonjs）
    execSync(`npx tsc "${src}" --outDir "${dir}" --target ES2018 --module commonjs --skipLibCheck --esModuleInterop`, { stdio: 'inherit' });
    // tsc 单文件模式输出文件名同名 .js
    console.log(`synced ${f} -> ${fn}/`);
  }
}
```

- [ ] **Step 2: 实现 `recoverBalls`**

```js
// cloudfunctions/recoverBalls/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 由 sync-shared 拷入的同名 JS
const { computeRecovery } = require('./balls-recovery');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];

  const isVip = user.membership && user.membership.expireAt > Date.now();
  const max = await getConfig(isVip ? 'vip_balls_max' : 'free_balls_max', isVip ? 10 : 3);
  const intervalHours = await getConfig(isVip ? 'recovery_speed_vip_hours' : 'recovery_interval_hours', isVip ? 2 : 4);
  const intervalMs = intervalHours * 3600 * 1000;

  const out = computeRecovery({
    currentBalls: user.balls,
    max,
    recoveredAt: user.ballsRecoveredAt,
    now: Date.now(),
    intervalMs,
  });

  if (out.recovered > 0) {
    await db.collection('users').doc(user._id).update({
      data: { balls: out.newBalls, ballsRecoveredAt: out.newRecoveredAt, updatedAt: Date.now() },
    });
  }
  return { ok: true, balls: out.newBalls, recovered: out.recovered };
};
```

`cloudfunctions/recoverBalls/package.json`：依赖 `wx-server-sdk`。

- [ ] **Step 3: 同步 shared 到 recoverBalls**

Run: `cd E:/cutcat && node scripts/sync-shared.js recoverBalls`
Expected: `cloudfunctions/recoverBalls/balls-recovery.js`、`types.js` 生成。

> 若 tsc 把 `types.ts` 编译出运行时无意义的空 JS（因为只有 type），属正常，require 不报错即可。

- [ ] **Step 4: 上传并测试**

上传 `recoverBalls`。在控制台先把某测试用户的 `ballsRecoveredAt` 改成 5 小时前，调用 recoverBalls。
Expected: balls +1，`ballsRecoveredAt` 前进 4h（保留 1h 余数）。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-shared.js cloudfunctions/recoverBalls
git commit -m "feat: recoverBalls 云函数（懒恢复）+ shared 同步脚本"
```

---

## Task 8: catchPet 核心云函数

**Files:**
- Create: `cloudfunctions/catchPet/index.js`, `cloudfunctions/catchPet/package.json`
- 用 `sync-shared.js` 拷入 `rarity-engine.js`

> 真实 AI 调用依赖微信 AI 具体能力（图像识别 + 多模态）。本 Task 实现完整事务框架，AI 部分封装为可替换的 `aiService`，先接真实调用接口、提供 mock 兜底以便联调。

- [ ] **Step 1: 创建 AI 服务封装 `cloudfunctions/catchPet/ai-service.js`**

```js
// cloudfunctions/catchPet/ai-service.js
// 封装微信 AI 调用。真实接口以微信云开发 AI 能力为准（如 openapi.images / 多模态）。
// 此处给出结构 + mock 兜底；接真实能力时替换内部实现即可，外部签名不变。

/**
 * 识别：返回 { isPet, petType, furColor, featureScore, qualityScore, aiScore }
 * fileID: 云存储文件 ID
 */
async function recognize(fileID) {
  // TODO(真实接入): 调用微信图像识别 / 多模态模型
  // 这里用 mock：默认认为是猫，分数随机但合理，便于联调。
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  return {
    isPet: true,
    petType: 'cat',
    furColor: ['橘猫', '三花', '奶牛', '黑猫', '白猫'][rand(0, 5)],
    featureScore: rand(20, 90),
    qualityScore: rand(40, 95),
    aiScore: rand(30, 90),
  };
}

/**
 * 生成卡面与文案：返回 { name, desc, artPrompt }
 * artPhoto 在 Task 9 由 genCardArt 单独生成；此处先返回文案与卡面占位 fileID。
 */
async function generateCardMeta(recognizeResult) {
  // TODO(真实接入): 调用多模态大模型生成卡名 + 文案
  const namePool = ['巷口橘影', '便利店守卫', '雨夜白袜', '老街常客', '窗台闲人'];
  const descPool = ['警觉地望着远方', '慵懒地打着哈欠', '神秘地隐入夜色', '亲昵地蹭过裤脚'];
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  return {
    name: namePool[rand(0, namePool.length)],
    desc: descPool[rand(0, descPool.length)],
    artPrompt: `${recognizeResult.furColor} 猫，卡牌插画风格`,
  };
}

module.exports = { recognize, generateCardMeta };
```

- [ ] **Step 2: 同步 rarity-engine 进 catchPet**

Run: `cd E:/cutcat && node scripts/sync-shared.js catchPet`
Expected: `cloudfunctions/catchPet/rarity-engine.js` 生成。

- [ ] **Step 3: 实现 `catchPet`（原子事务）**

```js
// cloudfunctions/catchPet/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const { computeRarity, DEFAULT_RARITY_CONFIG } = require('./rarity-engine');
const ai = require('./ai-service');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

// 地点分：有地点得基础分，无地点 0（防滥用定位刷分，MVP 简化）
function locationScore(location) {
  if (!location || !location.lat) return 0;
  return 60;
}
// 时间分：夜晚(20-6点) 加分
function timeScore(ts) {
  const h = new Date(ts).getHours();
  return (h >= 20 || h < 6) ? 70 : 30;
}

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { fileID, location } = event;
  if (!fileID) return { ok: false, error: 'no-file' };

  // 1. 校验用户与道具
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];
  if (user.balls <= 0) return { ok: false, error: 'no-balls' };

  // 2. AI 识别
  const rec = await ai.recognize(fileID);

  // 3. 友好失败：非宠物/低质量 → 不扣球
  if (!rec.isPet) {
    await db.collection('catches_log').add({ data: {
      openid, fileID, location: location || null,
      aiCostEstimate: 0.02, result: 'reject', consumedBall: false, createdAt: Date.now(),
    }});
    return { ok: true, data: { result: 'reject', reason: 'no-pet' } };
  }

  // 4. 生成卡面元数据
  const meta = await ai.generateCardMeta(rec);

  // 5. 稀有度
  const rarityConfig = {
    weights: (await getConfig('rarity_weights', DEFAULT_RARITY_CONFIG.weights)),
    thresholds: (await getConfig('rarity_thresholds', DEFAULT_RARITY_CONFIG.thresholds)),
  };
  const rarity = computeRarity({
    featureScore: rec.featureScore,
    qualityScore: rec.qualityScore,
    locationScore: locationScore(location),
    timeScore: timeScore(Date.now()),
    aiScore: rec.aiScore,
  }, rarityConfig);

  // 6. 写 card（事务内 + 扣道具）
  const now = Date.now();
  const cardData = {
    ownerOpenid: openid,
    cardNo,
    name: meta.name,
    rarity,
    level: 1,
    petType: rec.petType,
    furColor: rec.furColor,
    traits: [],
    originPhoto: fileID,
    artPhoto: fileID, // MVP 暂用原图作卡面，Task 9 可替换
    desc: meta.desc,
    caughtAt: now,
    caughtLocation: location || null,
    isPublic: true,
    createdAt: now,
  };

  // 用事务保证扣道具与写卡原子
  try {
    const result = await db.runTransaction(async transaction => {
      // 全局卡片编号自增：用 counters 集合的原子自增并读回
      let cardNo = 1;
      const ctr = await transaction.collection('counters').where({ _id: 'cardNo' }).get();
      if (ctr.data && ctr.data.length > 0) {
        await transaction.collection('counters').doc('cardNo').update({ data: { seq: _.inc(1) } });
        cardNo = ctr.data[0].seq + 1;
      } else {
        await transaction.collection('counters').add({ data: { _id: 'cardNo', seq: 1 } });
        cardNo = 1;
      }
      const cardRes = await transaction.collection('cards').add({ data: { ...cardData, cardNo } });
      await transaction.collection('users').doc(user._id).update({
        data: { balls: _.inc(-1), totalCaught: _.inc(1), updatedAt: now },
      });
      await transaction.collection('catches_log').add({ data: {
        openid, fileID, location: location || null,
        aiCostEstimate: 0.2, result: 'card', rarity, consumedBall: true, createdAt: now,
      }});
      return { _id: cardRes._id, cardNo };
    });
    const { _id: result, cardNo: resultCardNo } = result;
    return { ok: true, data: { result: 'card', card: { _id: result, ...cardData, cardNo: resultCardNo } } };
  } catch (e) {
    return { ok: false, error: 'txn-failed', detail: String(e) };
  }
};
```

`cloudfunctions/catchPet/package.json`：依赖 `wx-server-sdk`。

- [ ] **Step 4: 上传并测试**

上传 `catchPet`。准备一张猫图先 `wx.cloud.uploadFile` 拿 fileID，在控制台调用 `catchPet({ fileID })`。
Expected: 返回 `{ ok:true, data:{ result:'card', card:{...} } }`，users.balls -1，cards 多一条，catches_log 多一条 result:'card'。再传一张非猫图（如风景），Expected: `{ result:'reject' }` 且 balls 不变。

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/catchPet
git commit -m "feat: catchPet 核心原子事务（识别→生卡→扣道具，友好失败不扣球）"
```

---

## Task 9: genCardArt 云函数（重新生成卡面）

**Files:**
- Create: `cloudfunctions/genCardArt/index.js`, `package.json`

- [ ] **Step 1: 实现**

```js
// cloudfunctions/genCardArt/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  if (!cardId) return { ok: false, error: 'no-card' };

  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  if (u.data[0].balls <= 0) return { ok: false, error: 'no-balls' };

  const c = await db.collection('cards').doc(cardId).get();
  const card = c.data;
  if (!card || card.ownerOpenid !== openid) return { ok: false, error: 'forbidden' };

  // TODO(真实接入): 调用文生图能力，基于 card.furColor/name/desc 生成新卡面，上传云存储得 newFileID
  // MVP：保持原图，仅作流程打通（真实接入替换此处）
  const newFileID = card.originPhoto;

  try {
    await db.runTransaction(async transaction => {
      await transaction.collection('cards').doc(cardId).update({ data: { artPhoto: newFileID } });
      await transaction.collection('users').doc(u.data[0]._id).update({ data: { balls: _.inc(-1), updatedAt: Date.now() } });
    });
    return { ok: true, artPhoto: newFileID };
  } catch (e) {
    return { ok: false, error: 'txn-failed', detail: String(e) };
  }
};
```

- [ ] **Step 2: 上传测试**

上传，调用 `genCardArt({ cardId })`。
Expected: 返回新 artPhoto，users.balls -1。

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/genCardArt
git commit -m "feat: genCardArt 重新生成卡面（消耗道具，事务）"
```

---

## Task 10: getDex 与 getCardDetail 云函数

**Files:**
- Create: `cloudfunctions/getDex/index.js`, `cloudfunctions/getCardDetail/index.js`（各含 package.json）

- [ ] **Step 1: 实现 getDex（分页 + 排序）**

```js
// cloudfunctions/getDex/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const RARITY_ORDER = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { page = 1, pageSize = 20, sortBy = 'time' } = event;
  const skip = (page - 1) * pageSize;

  const countRes = await db.collection('cards').where({ ownerOpenid: openid }).count();
  const total = countRes.total;

  let cards = [];
  if (sortBy === 'rarity') {
    // 云数据库不直接支持自定义排序，取回后内存排
    const all = await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').limit(100).get();
    cards = all.data.sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0))
      .slice(skip, skip + pageSize);
  } else {
    const r = await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get();
    cards = r.data;
  }
  return { ok: true, cards, total, page, pageSize };
};
```

- [ ] **Step 2: 实现 getCardDetail**

```js
// cloudfunctions/getCardDetail/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  const r = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  if (!r.data) return { ok: false, error: 'not-found' };
  const card = r.data;
  // 仅本人可见精确坐标
  const isOwner = card.ownerOpenid === openid;
  return {
    ok: true,
    card: {
      ...card,
      caughtLocation: card.caughtLocation
        ? (isOwner ? card.caughtLocation : { publicArea: card.caughtLocation.publicArea })
        : null,
    },
  };
};
```

- [ ] **Step 3: 上传两个云函数并测试**

Expected: getDex 返回本人卡片列表；getCardDetail 本人返回完整坐标，非本人只返回 publicArea。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/getDex cloudfunctions/getCardDetail
git commit -m "feat: getDex 分页图鉴 + getCardDetail 隐私隔离"
```

---

## Task 11: 前端 services/cloud.ts 封装

**Files:**
- Create: `miniprogram/services/cloud.ts`

- [ ] **Step 1: 实现统一封装**

```ts
// miniprogram/services/cloud.ts
import type { Card, UserDoc, CatchResult, CatchLocation } from '../types';

interface CloudResp<T> { ok: boolean; data?: T; error?: string; [k: string]: any; }

function call<T = any>(name: string, data?: any): Promise<CloudResp<T>> {
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve(res.result as CloudResp<T>),
      fail: (err) => resolve({ ok: false, error: err.errMsg || 'cloud-call-failed' }),
    });
  });
}

export const api = {
  login: () => call<{ user: UserDoc }>('login'),
  getProfile: () => call<{ user: UserDoc }>('getProfile'),
  recoverBalls: () => call<{ balls: number; recovered: number }>('recoverBalls'),
  catchPet: (fileID: string, location: CatchLocation | null) =>
    call<{ result: CatchResult['result']; card?: Card; reason?: string }>('catchPet', { fileID, location }),
  genCardArt: (cardId: string) => call<{ artPhoto: string }>('genCardArt', { cardId }),
  getDex: (page = 1, sortBy: 'time' | 'rarity' = 'time') =>
    call<{ cards: Card[]; total: number }>('getDex', { page, sortBy }),
  getCardDetail: (cardId: string) => call<{ card: Card }>('getCardDetail', { cardId }),
};
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/services/cloud.ts
git commit -m "feat: 前端云函数调用统一封装 services/cloud.ts"
```

---

## Task 12: rarity-badge 组件

**Files:**
- Create: `miniprogram/components/rarity-badge/rarity-badge.ts`, `.json`, `.wxml`, `.wxss`

- [ ] **Step 1: 实现（配色 N灰/R蓝/SR紫/SSR金/UR彩虹）**

`rarity-badge.json`：
```json
{ "component": true }
```

`rarity-badge.ts`：
```ts
// miniprogram/components/rarity-badge/rarity-badge.ts
Component({
  properties: {
    rarity: { type: String, value: 'N' },
  },
  data: {
    label: '',
    cls: '',
  },
  observers: {
    rarity(r: string) {
      const map: Record<string, { label: string; cls: string }> = {
        N: { label: '普通', cls: 'r-n' },
        R: { label: '稀有', cls: 'r-r' },
        SR: { label: '超稀有', cls: 'r-sr' },
        SSR: { label: '传说', cls: 'r-ssr' },
        UR: { label: '幻兽', cls: 'r-ur' },
      };
      const m = map[r] || map.N;
      this.setData({ label: m.label, cls: m.cls });
    },
  },
});
```

`rarity-badge.wxml`：
```xml
<view class="badge {{cls}}">{{label}}</view>
```

`rarity-badge.wxss`：
```css
.badge { display:inline-block; padding:2rpx 14rpx; border-radius:20rpx; font-size:22rpx; }
.r-n { background:#555; color:#ddd; }
.r-r { background:#1e6fb8; color:#fff; }
.r-sr { background:#6b3fa0; color:#fff; }
.r-ssr { background:#d4af37; color:#2a1d05; font-weight:bold; }
.r-ur { background:linear-gradient(90deg,#ff5e5e,#ffd166,#06d6a0,#118ab2); color:#fff; font-weight:bold; }
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/components/rarity-badge
git commit -m "feat: rarity-badge 稀有度徽章组件"
```

---

## Task 13: 捕捉页（catch）

**Files:**
- Create: `miniprogram/pages/catch/catch.ts`, `.json`, `.wxml`, `.wxss`

- [ ] **Step 1: 实现 catch.ts**

```ts
// miniprogram/pages/catch/catch.ts
import { api } from '../../services/cloud';
import type { Card, CatchLocation } from '../../types';

Page({
  data: {
    balls: 0,
    catching: false,
    resultCard: null as Card | null,
    rejectMsg: '',
    location: null as CatchLocation | null,
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    await api.recoverBalls();
    const p = await api.getProfile();
    if (p.ok && p.data?.user) this.setData({ balls: p.data.user.balls });
  },

  async chooseAndCatch() {
    if (this.data.catching) return;
    if (this.data.balls <= 0) {
      wx.showToast({ title: '捕捉球用完了，稍后再来', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.setData({ catching: true, rejectMsg: '' });
        wx.showLoading({ title: '正在识别猫猫气息……', mask: true });
        const up = await wx.cloud.uploadFile({ cloudPath: `catch/${Date.now()}.jpg`, filePath: tempPath });
        const loc = await this.getLocation();
        const r = await api.catchPet(up.fileID, loc);
        wx.hideLoading();
        this.setData({ catching: false });
        if (!r.ok) { wx.showToast({ title: '捕捉失败', icon: 'none' }); return; }
        const d: any = r.data;
        if (d.result === 'reject') {
          this.setData({ rejectMsg: '没找到猫猫气息～换一张试试吧' });
        } else {
          this.setData({ resultCard: d.card, balls: this.data.balls - 1 });
        }
      },
    });
  },

  getLocation(): Promise<CatchLocation | null> {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => resolve({ lat: res.latitude, lng: res.longitude, publicArea: '我的位置' }),
        fail: () => resolve(null),
      });
    });
  },

  closeResult() {
    this.setData({ resultCard: null });
  },
});
```

`catch.json`：
```json
{ "usingComponents": {}, "navigationBarTitleText": "捕捉" }
```

- [ ] **Step 2: 实现 catch.wxml / catch.wxss**

`catch.wxml`：
```xml
<view class="catch-page">
  <view class="topbar">
    <text>🐱 捕捉</text>
    <text class="balls">捕捉球 ×{{balls}}</text>
  </view>

  <view class="stage">
    <view class="frame">取景框</view>
    <text class="hint" wx:if="{{balls > 0}}">⚪ 捕捉球已就绪</text>
    <text class="hint warn" wx:else>捕捉球恢复中…</text>
    <button class="btn-catch" bindtap="chooseAndCatch" disabled="{{catching || balls<=0}}">开始捕捉</button>
  </view>

  <view class="reject" wx:if="{{rejectMsg}}">{{rejectMsg}}</view>

  <view class="result-mask" wx:if="{{resultCard}}" bindtap="closeResult">
    <view class="card-pop">
      <image class="art" src="{{resultCard.artPhoto}}" mode="aspectFill"></image>
      <view class="card-name">{{resultCard.name}}</view>
      <view class="card-rarity">稀有度：{{resultCard.rarity}}</view>
      <view class="card-desc">{{resultCard.desc}}</view>
      <view class="card-tip">点按任意处关闭</view>
    </view>
  </view>
</view>
```

`catch.wxss`（精简，仪式感由 Task 14 组件增强）：
```css
.catch-page { padding: 32rpx; min-height: 100vh; }
.topbar { display:flex; justify-content:space-between; font-size:32rpx; margin-bottom:40rpx; }
.balls { color:#ffd166; }
.stage { display:flex; flex-direction:column; align-items:center; gap:32rpx; margin-top:80rpx; }
.frame { width:420rpx; height:420rpx; border:4rpx dashed #444; border-radius:24rpx; display:flex; align-items:center; justify-content:center; color:#666; }
.hint { color:#aaa; } .hint.warn { color:#e76f51; }
.btn-catch { background:#ffd166; color:#1a1a2e; border-radius:40rpx; width:60%; }
.reject { margin-top:40rpx; text-align:center; color:#e76f51; }
.result-mask { position:fixed; inset:0; background:rgba(0,0,0,.8); display:flex; align-items:center; justify-content:center; z-index:99; }
.card-pop { width:80%; background:#16213e; border-radius:24rpx; padding:32rpx; text-align:center; }
.art { width:100%; height:480rpx; border-radius:16rpx; }
.card-name { font-size:40rpx; font-weight:bold; margin:16rpx 0; color:#ffd166; }
.card-rarity { color:#bbb; } .card-desc { margin:16rpx 0; color:#ddd; }
.card-tip { font-size:22rpx; color:#777; }
```

- [ ] **Step 3: 预览验证**

在开发者工具编译预览，点"开始捕捉"选一张猫图。
Expected: 显示 loading "正在识别猫猫气息……"，结束弹出卡片；选非猫图显示 reject 文案；道具 -1。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/catch
git commit -m "feat: 捕捉页（拍照→上传→catchPet→翻卡/友好失败）"
```

---

## Task 14: card-flip 与 catch-progress 动画组件

**Files:**
- Create: `miniprogram/components/card-flip/*`, `miniprogram/components/catch-progress/*`

- [ ] **Step 1: card-flip 组件（翻卡动画）**

`card-flip.json`：`{ "component": true }`

`card-flip.ts`：
```ts
Component({
  properties: {
    artPhoto: { type: String, value: '' },
    name: { type: String, value: '' },
    rarity: { type: String, value: 'N' },
    flip: { type: Boolean, value: false, observer(v) { if (v) this.setData({ flipped: true }); } },
  },
  data: { flipped: false },
});
```

`card-flip.wxml`：
```xml
<view class="flip-card {{flipped ? 'flipped' : ''}}">
  <view class="face back">❓</view>
  <view class="face front">
    <image src="{{artPhoto}}" mode="aspectFill" class="art"></image>
    <view class="name">{{name}}</view>
  </view>
</view>
```

`card-flip.wxss`：
```css
.flip-card { width:420rpx; height:560rpx; position:relative; transform-style:preserve-3d; transition:transform .6s; }
.flip-card.flipped { transform: rotateY(180deg); }
.face { position:absolute; inset:0; backface-visibility:hidden; border-radius:24rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.back { background:#2a2a4a; color:#666; font-size:120rpx; }
.front { background:#16213e; transform: rotateY(180deg); }
.art { width:100%; height:460rpx; border-radius:16rpx; }
.name { color:#ffd166; font-size:36rpx; font-weight:bold; margin-top:12rpx; }
```

- [ ] **Step 2: catch-progress 组件（捕捉球加载动画）**

`catch-progress.json`：`{ "component": true }`
`catch-progress.wxml`：`<view class="ball-spin">⚪</view>`
`catch-progress.wxss`：`.ball-spin{font-size:120rpx;animation:spin 1s linear infinite;} @keyframes spin{to{transform:rotate(360deg);}}`
`catch-progress.ts`：`Component({});`

- [ ] **Step 3: 在 catch 页接入两个组件（替换 result 区）**

修改 `catch.json`：
```json
{ "usingComponents": { "card-flip": "/components/card-flip/card-flip", "catch-progress": "/components/catch-progress/catch-progress" } }
```

在 `catch.wxml` 的 loading 处替换为 `<catch-progress wx:if="{{catching}}" />`，结果区用 `<card-flip artPhoto="{{resultCard.artPhoto}}" name="{{resultCard.name}}" rarity="{{resultCard.rarity}}" flip="{{!!resultCard}}" />`。

- [ ] **Step 4: 预览验证**

Expected: 捕捉时显示旋转球；成功后卡片从背面翻到正面。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/components/card-flip miniprogram/components/catch-progress miniprogram/pages/catch
git commit -m "feat: card-flip 翻卡 + catch-progress 捕捉动画"
```

---

## Task 15: 图鉴页（dex）

**Files:**
- Create: `miniprogram/pages/dex/dex.*`

- [ ] **Step 1: 实现 dex.ts**

```ts
// miniprogram/pages/dex/dex.ts
import { api } from '../../services/cloud';
import type { Card } from '../../types';

Page({
  data: { cards: [] as Card[], sortBy: 'time' as 'time' | 'rarity', loading: false, total: 0 },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    const r = await api.getDex(1, this.data.sortBy);
    this.setData({ loading: false });
    if (r.ok && r.data?.cards) this.setData({ cards: r.data.cards, total: r.data.total });
  },

  toggleSort() {
    this.setData({ sortBy: this.data.sortBy === 'time' ? 'rarity' : 'time' }, () => this.load());
  },

  openCard(e: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: `/pages/card-detail/card-detail?id=${e.currentTarget.dataset.id}` });
  },
});
```

- [ ] **Step 2: dex.wxml / wxss / json**

`dex.json`：
```json
{ "usingComponents": { "rarity-badge": "/components/rarity-badge/rarity-badge" }, "navigationBarTitleText": "图鉴" }
```

`dex.wxml`：
```xml
<view class="dex">
  <view class="bar">
    <text>我的图鉴（{{total}}）</text>
    <text class="sort" bindtap="toggleSort">排序：{{sortBy === 'time' ? '最新' : '稀有度'}}</text>
  </view>
  <view class="grid">
    <view class="cell" wx:for="{{cards}}" wx:key="_id" bindtap="openCard" data-id="{{item._id}}">
      <image src="{{item.artPhoto}}" mode="aspectFill" class="thumb"></image>
      <rarity-badge rarity="{{item.rarity}}"></rarity-badge>
      <view class="title">{{item.name}}</view>
    </view>
  </view>
  <view wx:if="{{!loading && cards.length === 0}}" class="empty">还没有卡片，去捕捉第一只猫吧～</view>
</view>
```

`dex.wxss`：
```css
.dex { padding:24rpx; }
.bar { display:flex; justify-content:space-between; margin-bottom:24rpx; }
.sort { color:#ffd166; }
.grid { display:grid; grid-template-columns:repeat(2,1fr); gap:24rpx; }
.cell { background:#16213e; border-radius:20rpx; padding:16rpx; }
.thumb { width:100%; height:280rpx; border-radius:12rpx; }
.title { margin-top:8rpx; font-size:26rpx; }
.empty { text-align:center; color:#888; margin-top:120rpx; }
```

- [ ] **Step 3: 预览验证**

Expected: 图鉴网格展示卡片，可切换排序，点击进详情页（Task 16）。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/dex
git commit -m "feat: 图鉴页（网格+稀有度徽章+排序）"
```

---

## Task 16: 卡片详情页（card-detail）

**Files:**
- Create: `miniprogram/pages/card-detail/card-detail.*`

- [ ] **Step 1: 实现 card-detail.ts**

```ts
// miniprogram/pages/card-detail/card-detail.ts
import { api } from '../../services/cloud';
import type { Card } from '../../types';

Page({
  data: { card: null as Card | null, regenerating: false },

  onLoad(options: { id?: string }) {
    if (options.id) this.load(options.id);
  },

  async load(id: string) {
    const r = await api.getCardDetail(id);
    if (r.ok && r.data?.card) this.setData({ card: r.data.card });
  },

  async regenerate() {
    if (!this.data.card || this.data.regenerating) return;
    this.setData({ regenerating: true });
    const r = await api.genCardArt(this.data.card._id);
    this.setData({ regenerating: false });
    if (r.ok && r.data?.artPhoto) this.setData({ card: { ...this.data.card!, artPhoto: r.data.artPhoto } });
  },

  share() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  },
});
```

- [ ] **Step 2: card-detail.wxml / wxss / json**

`card-detail.json`：`{ "usingComponents": { "rarity-badge": "/components/rarity-badge/rarity-badge" } }`

`card-detail.wxml`：
```xml
<view class="detail" wx:if="{{card}}">
  <image src="{{card.artPhoto}}" mode="aspectFill" class="big"></image>
  <view class="name">{{card.name}}</view>
  <rarity-badge rarity="{{card.rarity}}"></rarity-badge>
  <view class="row">等级 {{card.level}} · {{card.furColor}}</view>
  <view class="row">{{card.desc}}</view>
  <view class="row loc">📍 {{card.caughtLocation.publicArea || '未知地点'}}</view>
  <view class="row time">捕捉于 {{card.caughtAt}}</view>
  <view class="actions">
    <button bindtap="regenerate" disabled="{{regenerating}}">重生成卡面</button>
    <button bindtap="share">分享</button>
  </view>
</view>
```

`card-detail.wxss`：
```css
.detail { padding:32rpx; }
.big { width:100%; height:600rpx; border-radius:24rpx; }
.name { font-size:44rpx; font-weight:bold; color:#ffd166; margin:24rpx 0 12rpx; }
.row { margin:12rpx 0; color:#ccc; }
.row.loc { color:#06d6a0; }
.actions { display:flex; gap:24rpx; margin-top:40rpx; }
```

> 时间戳显示：MVP 用原始数字，后续可用 `utils/format.ts` 格式化（Task 2 已留 utils 目录）。

- [ ] **Step 3: 预览验证**

Expected: 从图鉴点入，显示完整卡片；本人能看到地点；点"重生成卡面"扣道具并刷新。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/card-detail
git commit -m "feat: 卡片详情页（隐私隔离地点+重生卡面）"
```

---

## Task 17: 我的页（profile）

**Files:**
- Create: `miniprogram/pages/profile/profile.*`

- [ ] **Step 1: 实现**

```ts
// miniprogram/pages/profile/profile.ts
import { api } from '../../services/cloud';
import type { UserDoc } from '../../types';

Page({
  data: { user: null as UserDoc | null },
  onShow() { this.load(); },
  async load() {
    const r = await api.getProfile();
    if (r.ok && r.data?.user) this.setData({ user: r.data.user });
  },
});
```

`profile.json`：`{ "usingComponents": {}, "navigationBarTitleText": "我的" }`

`profile.wxml`：
```xml
<view class="profile" wx:if="{{user}}">
  <view class="card">
    <view class="title">我的捕捉球</view>
    <view class="balls">{{user.balls}} / {{user.ballsMax}}</view>
    <view class="sub">随时间自动恢复</view>
  </view>
  <view class="card">
    <view class="title">已收集</view>
    <view class="num">{{user.totalCaught}}</view>
  </view>
  <view class="card member">
    <view class="title">会员</view>
    <view class="num">{{user.membership ? 'VIP' : '未开通'}}</view>
    <view class="sub">加道具上限与恢复速度（即将开放）</view>
  </view>
</view>
```

`profile.wxss`：
```css
.profile { padding:24rpx; display:flex; flex-direction:column; gap:24rpx; }
.card { background:#16213e; border-radius:24rpx; padding:32rpx; }
.title { color:#888; font-size:26rpx; }
.balls, .num { font-size:56rpx; color:#ffd166; font-weight:bold; margin:12rpx 0; }
.sub { color:#666; font-size:24rpx; }
```

- [ ] **Step 2: 预览验证**

Expected: 显示道具余额（x/max）、收集数、会员状态。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/profile
git commit -m "feat: 我的页（道具余额/收集/会员占位）"
```

---

## Task 18: 联调与验收

**Files:**
- 全项目；对照 spec 第 9 节验收标准逐项核对。

- [ ] **Step 1: 上传全部云函数**

在开发者工具对 8 个云函数逐一"上传并部署：云端安装依赖"。
Expected: 云函数列表全部可见、状态正常。

- [ ] **Step 2: 跑单测回归**

Run: `cd E:/cutcat && npm test`
Expected: 10 个 test 全 PASS。

- [ ] **Step 3: 端到端走查（对照 spec 验收标准 1-8）**

1. 完整闭环：拍照→生卡→图鉴可见 ✓
2. 球消耗：成功 -1，非宠物不扣 ✓
3. 道具恢复：改 `ballsRecoveredAt` 到 5h 前，重进首页，球 +1，余数保留 ✓
4. 稀有度五档：连传多张猫图，观察 N/R/SR/SSR/UR 分布合理（mock 下分数随机，能出现多档即可）✓
5. 卡片记录：卡名/稀有度/时间/地点齐全，地点对外仅区域 ✓
6. 3 Tab + 详情页正常 ✓
7. AI Key 不在前端（检查 `miniprogram/` 无任何密钥，AI 调用全在云函数）✓
8. catches_log 每次捕捉有记录含成本 ✓

- [ ] **Step 4: 修复发现的问题，提交**

```bash
git add -A
git commit -m "chore: 联调修复与验收核对"
```

- [ ] **Step 5: 打 tag 标记 MVP**

```bash
git tag -a v0.1.0-mvp -m "cutcat MVP 完成：拍猫→识别→生卡→图鉴→道具恢复"
```

---

## 后续（Phase 2/3 占位，不在本计划内）

- Phase 2：社交展示/交换/赠送、同一只猫"再次相遇"养成（用 `catches_log.result:'dup'`）、地图社交
- Phase 3：交易市场（合规/风控/支付）
- 全程：将 `ai-service.js` 的 mock 替换为真实微信 AI 能力（图像识别 + 多模态生卡面）
