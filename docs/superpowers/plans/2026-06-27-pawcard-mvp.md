# pawcard MVP 实现计划（微信小游戏 / Cocos Creator 版）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现现实宠物卡牌收集微信小游戏 pawcard 的 MVP——拍猫 → AI 识别 → ControlNet 重绘炫酷卡牌 → 入图鉴 → 道具消耗与自然恢复，全程两次仪式感动画。

**Architecture:** Cocos Creator 3.8 LTS(TS) 前端（单 MainScene + 多 Panel + 详情弹窗）+ 微信云开发后端（云函数 + 云数据库 + 云存储）+ 云端图生图 API(ControlNet)。catchPet 秒回骨架卡（artStatus:pending）→ 后台异步重绘 → 前端轮询 artStatus 触发卡面升级。纯逻辑（稀有度引擎、道具恢复）独立成 `shared/` 用 Node 单测覆盖。

**Tech Stack:** Cocos Creator 3.8 + TypeScript、微信云开发、Node.js + `node:test`/`tsx`（单测）、云端图生图大模型 API。

**前置条件（用户已提供/填入）：**
- 小游戏 AppID：`wx5f2be181d74900e1`
- 云开发环境 ID：`cloudbase-d0gm6j7hqbc346db6`
- 图生图 API：在云函数环境变量配置（key 名 `ART_API_URL` / `ART_API_KEY`），MVP 可先 mock 兜底

---

## ⚠️ 环境现实约束（必读）

**Cocos Creator 是可视化编辑器，部分产物无法用命令行/纯代码复现：**

1. **`.scene` / `.prefab` 文件**：是 Cocos 编辑器序列化的二进制/JSON，必须**在 Cocos Dashboard 图形界面**创建节点、拖组件、调参数。本计划对这些步骤写明"操作清单"，由执行者在编辑器完成。
2. **粒子特效 / 动画曲线**：稀有度光效粒子、翻卡动画的缓动曲线，在编辑器里调参。脚本侧用 `tween` 代码可覆盖大部分，复杂粒子用编辑器 ParticleSystem。
3. **真机/模拟器验证**：Cocos 构建到微信小游戏需 Cocos 编辑器 + 微信开发者工具，命令行无法完成。验证步骤写明预期产物与如何验证。
4. **可命令行验证的**：`shared/` 纯逻辑单测（`npm test`）、云函数结构正确性。

**执行者需先安装：** Cocos Creator 3.8.x（经 Cocos Dashboard）、微信开发者工具（小游戏模式）。

---

## 文件结构总览

### 前端 `assets/scripts/`（Cocos）

| 文件 | 职责 |
|---|---|
| `core/App.ts` | 游戏入口，初始化云开发、全局状态 |
| `core/EventManager.ts` | 简易事件总线（卡面就绪通知等） |
| `core/GameState.ts` | 全局状态：当前 user、道具、当前 Panel |
| `services/CloudService.ts` | 封装所有 `wx.cloud.callFunction` |
| `services/WxService.ts` | 拍照/选图、定位、上传 |
| `panels/CatchPanel.ts` | 捕获面板逻辑 |
| `panels/DexPanel.ts` | 图鉴面板逻辑 |
| `panels/ProfilePanel.ts` | 我的面板逻辑 |
| `ui/CardView.ts` | 卡牌视图组件 |
| `ui/RarityBadge.ts` | 稀有度徽章 |
| `ui/BallCounter.ts` | 道具计数器 |
| `ui/CatchAnim.ts` | 捕捉中动画 |
| `ui/CardFlipAnim.ts` | 翻卡动画 |
| `ui/RarityBurst.ts` | 稀有度光效粒子 |
| `ui/TabBar.ts` | 底部 Tab 切换 |
| `scenes/CardDetailModal.ts` | 详情弹窗 |
| `utils/colors.ts` | 稀有度配色表 |
| `utils/format.ts` | 时间格式化 |

### 后端 `cloudfunctions/`

| 文件 | 职责 |
|---|---|
| `shared/types.ts` | 共享类型 |
| `shared/rarity-engine.ts` | 稀有度规则引擎 |
| `shared/balls-recovery.ts` | 道具懒恢复算法 |
| `shared/art-provider.ts` | 图生图 API 封装（可替换，mock 兜底） |
| `cloudfunctions/login/index.js` | 换 openid + 初始化 users |
| `cloudfunctions/recoverBalls/index.js` | 懒恢复 |
| `cloudfunctions/getProfile/index.js` | 我的 |
| `cloudfunctions/catchPet/index.js` | 识别+算稀有度+写骨架卡+异步触发重绘+扣道具 |
| `cloudfunctions/genCardArtTask/index.js` | 后台重绘（ControlNet 生图） |
| `cloudfunctions/genCardArt/index.js` | 用户主动重生成 |
| `cloudfunctions/getDex/index.js` | 分页图鉴 |
| `cloudfunctions/getCardDetail/index.js` | 详情（前端轮询 artStatus，懒触发重绘） |

### 测试 `tests/`
- `rarity-engine.test.ts`、`balls-recovery.test.ts`

---

## 任务依赖关系

```
T1(项目骨架) → T2(共享类型) → T3(云函数脚手架+DB初始化) → T4(login+getProfile)
T5(恢复算法TDD) ─┐
T6(稀有度引擎TDD)─┤→ T7(recoverBalls) → T8(art-provider) → T9(catchPet) → T10(genCardArtTask) → T11(genCardArt)
                                                                  → T12(getDex+getCardDetail)
T13(Cocos服务封装) → T14(UI组件:CardView/Badge/BallCounter) → T15(动画:Flip/Burst/CatchAnim)
T16(三个Panel+TabBar) → T17(MainScene场景搭建) → T18(详情弹窗) → T19(联调验收)
```

后端(T1-T12)与前端(T13-T18)可并行，T19 联调收口。

---

## Task 1: 项目骨架与配置

**Files:**
- Create: 根 `package.json`、`tsconfig.json`、`tsconfig.shared.json`
- Cocos 项目：用 Cocos Dashboard 创建（编辑器操作）
- Create: `project.config.json`（微信小游戏构建配置）

- [ ] **Step 1: 创建根 `package.json`（管理云函数依赖 + 单测）**

```json
{
  "name": "pawcard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "node --test --import tsx tests/",
    "sync:shared": "node scripts/sync-shared.js"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0"
  }
}
```

- [ ] **Step 2: 创建根 `tsconfig.json`（前端脚本编译参考）**

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ES2015",
    "moduleResolution": "node",
    "strict": true,
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "db://*": ["./assets/scripts/*"] }
  },
  "include": ["assets/scripts/**/*.ts", "shared/**/*.ts"]
}
```

- [ ] **Step 3: 创建 `tsconfig.shared.json`（shared 编译到云函数）**

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

- [ ] **Step 4: 用 Cocos Dashboard 创建小游戏项目（编辑器操作）**

打开 Cocos Dashboard → 新建项目 → 选 **Empty(2D)** 模板 → 名称 `pawcard` → 创建到 `E:\cutcat` 同级或直接作为项目根（Cocos 会生成 `assets/`、`settings/`、`project.json` 等）。
> 若 Cocos 要求空目录，可将已有 `docs/` `.gitignore` 临时移出，建好再移回。

- [ ] **Step 5: 安装根依赖**

Run: `cd E:/cutcat && npm install`
Expected: `node_modules/` 生成，无报错。

- [ ] **Step 6: 创建 `project.config.json`（微信小游戏项目配置）**

> Cocos 构建微信小游戏时会生成 `build/wechatgame/`，此文件供微信开发者工具打开构建产物用。

```json
{
  "appid": "wx5f2be181d74900e1",
  "projectname": "pawcard",
  "setting": { "es6": true, "minified": true },
  "compileType": "minigame",
  "libVersion": "3.5.5"
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json tsconfig.shared.json project.config.json assets settings
git commit -m "feat: 项目骨架与配置（Cocos Creator 3.8 小游戏）"
```

---

## Task 2: 共享类型定义

**Files:**
- Create: `shared/types.ts`、`assets/scripts/core/Types.ts`（前端一份镜像，Cocos 无法跨目录 import shared）

- [ ] **Step 1: 写后端共享类型 `shared/types.ts`**

```ts
// shared/types.ts
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type PetType = 'cat' | 'dog' | 'other';
export type ArtStatus = 'pending' | 'done' | 'failed';

export interface CatchLocation {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  publicArea: string;
}

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
  originPhoto: string;
  artPhoto: string;
  artStatus: ArtStatus;
  desc: string;
  caughtAt: number;
  caughtLocation: CatchLocation | null;
  isPublic: boolean;
  createdAt: number;
}

export interface UserDoc {
  _id: string;
  openid: string;
  nickname: string;
  avatar: string;
  balls: number;
  ballsMax: number;
  ballsRecoveredAt: number;
  membership: { level: 'vip'; expireAt: number } | null;
  totalCaught: number;
  createdAt: number;
  updatedAt: number;
}

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

/** 识别结果（AI 识别服务输出） */
export interface RecognizeResult {
  isPet: boolean;
  petType: PetType;
  furColor: string;
  featureScore: number;
  qualityScore: number;
  aiScore: number;
}
```

- [ ] **Step 2: 写前端镜像类型 `assets/scripts/core/Types.ts`**

> 内容与 `shared/types.ts` 完全相同（Cocos 项目无法 import 仓库根的 shared）。注释顶部标注"与 shared/types.ts 保持同步，改一处改两处"。

```ts
// assets/scripts/core/Types.ts
// ⚠️ 与 shared/types.ts 保持同步镜像（Cocos 无法跨目录 import）
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type PetType = 'cat' | 'dog' | 'other';
export type ArtStatus = 'pending' | 'done' | 'failed';
// ...（同 shared/types.ts 全部内容，逐字复制）
```

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts assets/scripts/core/Types.ts
git commit -m "feat: 共享类型定义（Card/User/Rarity/ArtStatus，前后端镜像）"
```

---

## Task 3: 云函数脚手架与数据库初始化

**Files:**
- Create: `cloudfunctions/login/package.json`、`cloudfunctions/login/index.js`（占位）
- Create: `scripts/sync-shared.js`
- 数据库：4 集合 + config 初始数据（云开发控制台操作）

- [ ] **Step 1: 创建 `cloudfunctions/login/package.json`**

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": { "wx-server-sdk": "~2.6.3" }
}
```

- [ ] **Step 2: 占位 `cloudfunctions/login/index.js`**

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async () => ({ todo: 'login' });
```

- [ ] **Step 3: 创建同步脚本 `scripts/sync-shared.js`**

```js
// scripts/sync-shared.js
// 把 shared/*.ts 编译为 JS 并拷进指定云函数目录
// 用法: node scripts/sync-shared.js catchPet recoverBalls getCardDetail ...
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHARED_FILES = ['types.ts', 'rarity-engine.ts', 'balls-recovery.ts', 'art-provider.ts'];
const ROOT = path.resolve(__dirname, '..');
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
    execSync(`npx tsc "${src}" --outDir "${dir}" --target ES2018 --module commonjs --skipLibCheck --esModuleInterop`, { stdio: 'inherit' });
    console.log(`synced ${f} -> ${fn}/`);
  }
}
```

- [ ] **Step 4: 数据库初始化（云开发控制台操作）**

打开微信开发者工具 → 云开发（环境 `cloudbase-d0gm6j7hqbc346db6`）→ 数据库，创建 4 个集合：
`users`、`cards`、`catches_log`、`config`、`counters`（5 个，counters 存 cardNo 自增）。

**集合权限设置：**
- `users` / `cards` / `catches_log` / `counters`：仅创建者可读写
- `config`：所有用户可读

**向 `config` 插入初始记录：**

```json
[
  { "key": "recovery_interval_hours", "value": 4 },
  { "key": "recovery_speed_vip_hours", "value": 2 },
  { "key": "free_balls_max", "value": 3 },
  { "key": "vip_balls_max", "value": 10 },
  { "key": "rarity_weights", "value": { "feature": 30, "quality": 25, "location": 15, "time": 10, "ai": 20 } },
  { "key": "rarity_thresholds", "value": { "N": 0, "R": 35, "SR": 55, "SSR": 75, "UR": 90 } },
  { "key": "artgen_cost_per_card", "value": 0.2 },
  { "key": "artgen_retry_threshold", "value": 0.5 }
]
```

Expected: 控制台显示 5 个集合，config 有 8 条记录。

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-shared.js cloudfunctions/login
git commit -m "feat: 云函数脚手架 + shared 同步脚本 + DB 集合初始化"
```

---

## Task 4: login 与 getProfile 云函数

**Files:**
- Modify: `cloudfunctions/login/index.js`
- Create: `cloudfunctions/getProfile/`

- [ ] **Step 1: 实现 `login`**

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, error: 'no-openid' };
  const now = Date.now();
  const existing = await db.collection('users').where({ openid }).limit(1).get();
  if (existing.data.length > 0) return { ok: true, user: existing.data[0] };
  const cfg = await db.collection('config').where({ key: 'free_balls_max' }).limit(1).get();
  const freeMax = cfg.data[0]?.value ?? 3;
  const newUser = {
    openid, nickname: '', avatar: '',
    balls: freeMax, ballsMax: freeMax, ballsRecoveredAt: now,
    membership: null, totalCaught: 0, createdAt: now, updatedAt: now,
  };
  const res = await db.collection('users').add({ data: newUser });
  return { ok: true, user: { _id: res._id, ...newUser } };
};
```

- [ ] **Step 2: 创建 `cloudfunctions/getProfile/index.js`**

```js
// cloudfunctions/getProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  return { ok: true, user: u.data[0] };
};
```

`cloudfunctions/getProfile/package.json` 同 login。

- [ ] **Step 3: 上传并测试（微信开发者工具）**

右键 `cloudfunctions/login` → 上传并部署：云端安装依赖。getProfile 同理。
用控制台云函数本地调试或前端调用测试 login。
Expected: 返回 `{ ok:true, user:{..., balls:3 } }`，users 集合新增一条。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/login cloudfunctions/getProfile
git commit -m "feat: login 首次初始化 + getProfile 云函数"
```

---

## Task 5: 道具恢复算法（TDD）

**Files:**
- Create: `shared/balls-recovery.ts`、`tests/balls-recovery.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// tests/balls-recovery.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecovery } from '../shared/balls-recovery';

const HOUR = 3600 * 1000;

test('不足一个 interval 不补发', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 3 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 0); assert.equal(o.newBalls, 0); assert.equal(o.newRecoveredAt, 0);
});

test('满一个 interval 补 1 余数 0', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 4 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 1); assert.equal(o.newBalls, 1); assert.equal(o.newRecoveredAt, 4 * HOUR);
});

test('余数时间保留不被吞', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 9 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 2); assert.equal(o.newBalls, 2); assert.equal(o.newRecoveredAt, 8 * HOUR);
});

test('不超过上限', () => {
  const o = computeRecovery({ currentBalls: 2, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.newBalls, 3); assert.equal(o.recovered, 1);
});

test('已满上限不补不前进', () => {
  const o = computeRecovery({ currentBalls: 3, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.newBalls, 3); assert.equal(o.recovered, 0); assert.equal(o.newRecoveredAt, 0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd E:/cutcat && npm test`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

```ts
// shared/balls-recovery.ts
import type { RecoveryInput, RecoveryOutput } from './types';

export function computeRecovery(input: RecoveryInput): RecoveryOutput {
  const { currentBalls, max, recoveredAt, now, intervalMs } = input;
  if (now <= recoveredAt || intervalMs <= 0) return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  if (currentBalls >= max) return { newBalls: max, newRecoveredAt: recoveredAt, recovered: 0 };
  const recoverable = Math.floor((now - recoveredAt) / intervalMs);
  if (recoverable <= 0) return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  const newBalls = Math.min(currentBalls + recoverable, max);
  const recovered = newBalls - currentBalls;
  return { newBalls, newRecoveredAt: recoveredAt + recovered * intervalMs, recovered };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd E:/cutcat && npm test`
Expected: 5 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/balls-recovery.ts tests/balls-recovery.test.ts
git commit -m "feat(tdd): 道具懒恢复算法 + 5 单测"
```

---

## Task 6: 稀有度规则引擎（TDD）

**Files:**
- Create: `shared/rarity-engine.ts`、`tests/rarity-engine.test.ts`

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

const all = (s: number) => ({ featureScore: s, qualityScore: s, locationScore: s, timeScore: s, aiScore: s });

test('全 0 → N', () => assert.equal(computeRarity(all(0), config), 'N'));
test('全 100 → UR', () => assert.equal(computeRarity(all(100), config), 'UR'));
test('全 50 → R', () => assert.equal(computeRarity(all(50), config), 'R'));
test('全 80 → SSR', () => assert.equal(computeRarity(all(80), config), 'SSR'));
test('阈值下界 全 35 → R', () => assert.equal(computeRarity(all(35), config), 'R'));
test('全 65 → SR', () => assert.equal(computeRarity(all(65), config), 'SR'));
```

- [ ] **Step 2: 运行确认失败**

Run: `cd E:/cutcat && npm test`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
// shared/rarity-engine.ts
import type { RarityInput, RarityConfig, Rarity } from './types';

export function computeRarity(input: RarityInput, config: RarityConfig): Rarity {
  const w = config.weights;
  const score = (input.featureScore * w.feature + input.qualityScore * w.quality
    + input.locationScore * w.location + input.timeScore * w.time + input.aiScore * w.ai) / 100;
  const t = config.thresholds;
  if (score >= t.UR) return 'UR';
  if (score >= t.SSR) return 'SSR';
  if (score >= t.SR) return 'SR';
  if (score >= t.R) return 'R';
  return 'N';
}

export const DEFAULT_RARITY_CONFIG: RarityConfig = {
  weights: { feature: 30, quality: 25, location: 15, time: 10, ai: 20 },
  thresholds: { N: 0, R: 35, SR: 55, SSR: 75, UR: 90 },
};
```

- [ ] **Step 4: 运行确认通过**

Run: `cd E:/cutcat && npm test`
Expected: balls-recovery 5 + rarity-engine 6 = 11 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/rarity-engine.ts tests/rarity-engine.test.ts
git commit -m "feat(tdd): 稀有度规则引擎 + 6 单测"
```

---

## Task 7: recoverBalls 云函数

**Files:**
- Create: `cloudfunctions/recoverBalls/`

- [ ] **Step 1: 实现**

```js
// cloudfunctions/recoverBalls/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { computeRecovery } = require('./balls-recovery');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];
  const isVip = user.membership && user.membership.expireAt > Date.now();
  const max = await getConfig(isVip ? 'vip_balls_max' : 'free_balls_max', isVip ? 10 : 3);
  const intervalHours = await getConfig(isVip ? 'recovery_speed_vip_hours' : 'recovery_interval_hours', isVip ? 2 : 4);
  const out = computeRecovery({
    currentBalls: user.balls, max, recoveredAt: user.ballsRecoveredAt,
    now: Date.now(), intervalMs: intervalHours * 3600 * 1000,
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

- [ ] **Step 2: 同步 shared**

Run: `cd E:/cutcat && npm run sync:shared -- recoverBalls`
Expected: `cloudfunctions/recoverBalls/balls-recovery.js`、`types.js` 生成。

- [ ] **Step 3: 上传测试**

改某用户 `ballsRecoveredAt` 到 5 小时前，调 recoverBalls。
Expected: balls +1，ballsRecoveredAt 前进 4h（保留 1h）。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/recoverBalls
git commit -m "feat: recoverBalls 懒恢复云函数"
```

---

## Task 8: art-provider（图生图 API 封装，可替换 + mock 兜底）

**Files:**
- Create: `shared/art-provider.ts`

> 这是"照片→炫酷卡牌"的技术核心。封装为可替换接口：有 `ART_API_URL` 配真实 API，否则 mock 兜底（保证链路可跑）。

- [ ] **Step 1: 实现 art-provider**

```ts
// shared/art-provider.ts
import type { Rarity, RecognizeResult } from './types';

export interface ArtGenInput {
  originFileID: string;        // 云存储 fileID
  rarity: Rarity;
  recognize: RecognizeResult;  // 毛色/姿态等用于提示词
}

export interface ArtGenOutput {
  artFileID: string;           // 重绘图 fileID
  qualityScore: number;        // 0-1，质量分（过低触发重试）
  costEstimate: number;        // ¥
}

/**
 * 调图生图 API：ControlNet 锁猫轮廓 + 卡牌风格提示词。
 * 真实接入：读取环境变量 ART_API_URL / ART_API_KEY。
 * mock 兜底：直接用原图返回（qualityScore 给中等值，不触发重试），便于联调。
 */
export async function generateCardArt(input: ArtGenInput): Promise<ArtGenOutput> {
  const apiUrl = process.env.ART_API_URL;
  const apiKey = process.env.ART_API_KEY;

  // ---- mock 兜底（无 API 配置时）----
  if (!apiUrl || !apiKey) {
    return { artFileID: input.originFileID, qualityScore: 0.7, costEstimate: 0 };
  }

  // ---- 真实接入 ----
  const prompt = buildPrompt(input.rarity, input.recognize);
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      mode: 'img2img',
      controlnet: 'canny',          // 锁轮廓，保证"还是那只猫"
      init_image: input.originFileID,
      prompt,
      strength: 0.6,                // 保留原图结构，0.5-0.7 之间
      num_images: 1,
    }),
  });
  if (!resp.ok) throw new Error(`art api ${resp.status}`);
  const data: any = await resp.json();
  return {
    artFileID: data.image_file_id,   // API 返回的图（已上传或需再上传云存储）
    qualityScore: data.quality_score ?? 0.7,
    costEstimate: 0.2,
  };
}

function buildPrompt(rarity: Rarity, rec: RecognizeResult): string {
  const flair: Record<Rarity, string> = {
    N: '简洁清新插画',
    R: '精致卡牌插画，柔和光效',
    SR: '华丽卡牌插画，魔法光效，丰富细节',
    SSR: '史诗传说级卡牌，金光粒子，神圣光晕，极高细节',
    UR: '幻兽级史诗卡牌，全屏彩虹光爆裂，传说气场，极致华丽',
  };
  return `${rec.furColor} 猫，${flair[rarity]}，居中构图，TCG 集换式卡牌风格，大师级`;
}
```

> **云函数运行时 fetch**：微信云函数 Node 18+ 已内置全局 `fetch`。若环境为旧版，改用 `axios`/`got`（加入云函数 package.json）。

- [ ] **Step 2: Commit**

```bash
git add shared/art-provider.ts
git commit -m "feat: art-provider 图生图封装（ControlNet，mock 兜底）"
```

---

## Task 9: catchPet 核心云函数（异步链路）

**Files:**
- Create: `cloudfunctions/catchPet/index.js`、`package.json`、`recognize.js`（识别封装）
- 同步 shared：`types`、`rarity-engine`、`art-provider`

- [ ] **Step 1: 创建识别封装 `cloudfunctions/catchPet/recognize.js`**

```js
// cloudfunctions/catchPet/recognize.js
// 微信图像识别 / 多模态，判断是否猫/毛色/质量分。mock 兜底。
async function recognize(fileID) {
  // TODO(真实接入): 调用微信图像识别或多模态大模型
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
module.exports = { recognize };
```

- [ ] **Step 2: 同步 shared 到 catchPet**

Run: `cd E:/cutcat && npm run sync:shared -- catchPet`
Expected: `cloudfunctions/catchPet/{types,rarity-engine,art-provider}.js` 生成。

> 注：art-provider 在 catchPet 里**不调用**（重绘在 genCardArtTask），但为保持 shared 完整一并同步。catchPet 只需 rarity-engine。

- [ ] **Step 3: 实现 `catchPet/index.js`（秒回骨架卡 + 异步触发）**

```js
// cloudfunctions/catchPet/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { computeRarity, DEFAULT_RARITY_CONFIG } = require('./rarity-engine');
const { recognize } = require('./recognize');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}
function locationScore(loc) { return (loc && loc.lat) ? 60 : 0; }
function timeScore(ts) { const h = new Date(ts).getHours(); return (h >= 20 || h < 6) ? 70 : 30; }

/** 兜底生成卡名+文案。真实接入应调多模态大模型按毛色/稀有度生成。MVP 用风格化模板。 */
function genCardMeta(rec) {
  const namePrefix = { '橘猫': '橘', '三花': '花', '奶牛': '墨', '黑猫': '夜', '白猫': '雪' };
  const nameScene = ['巷影', '街角', '檐下', '灯前', '雨后', '窗台'];
  const descPool = ['警觉地望着远方', '慵懒地打着哈欠', '神秘地隐入夜色', '亲昵地蹭过裤脚', '安静地梳理毛发'];
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const p = namePrefix[rec.furColor] || '喵';
  return {
    name: `${p}${rand(nameScene)}`,
    desc: rand(descPool),
  };
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { fileID, location } = event;
  if (!fileID) return { ok: false, error: 'no-file' };

  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];
  if (user.balls <= 0) return { ok: false, error: 'no-balls' };

  // 识别
  const rec = await recognize(fileID);
  if (!rec.isPet) {
    await db.collection('catches_log').add({ data: {
      openid, fileID, location: location || null, aiCostEstimate: 0.02,
      result: 'reject', consumedBall: false, createdAt: Date.now(),
    }});
    return { ok: true, data: { result: 'reject', reason: 'no-pet' } };
  }

  // 稀有度
  const rarityConfig = {
    weights: await getConfig('rarity_weights', DEFAULT_RARITY_CONFIG.weights),
    thresholds: await getConfig('rarity_thresholds', DEFAULT_RARITY_CONFIG.thresholds),
  };
  const rarity = computeRarity({
    featureScore: rec.featureScore, qualityScore: rec.qualityScore,
    locationScore: locationScore(location), timeScore: timeScore(Date.now()), aiScore: rec.aiScore,
  }, rarityConfig);

  const now = Date.now();
  const { name, desc } = genCardMeta(rec);
  const cardBase = {
    ownerOpenid: openid, name, rarity, level: 1,
    petType: rec.petType, furColor: rec.furColor, traits: [],
    originPhoto: fileID, artPhoto: fileID, artStatus: 'pending',
    desc, caughtAt: now, caughtLocation: location || null, isPublic: true, createdAt: now,
  };

  // 事务：编号自增 + 写卡 + 扣道具 + 写日志
  try {
    const ret = await db.runTransaction(async tx => {
      let cardNo = 1;
      const ctr = await tx.collection('counters').where({ _id: 'cardNo' }).get();
      if (ctr.data && ctr.data.length > 0) {
        await tx.collection('counters').doc('cardNo').update({ data: { seq: _.inc(1) } });
        cardNo = ctr.data[0].seq + 1;
      } else {
        await tx.collection('counters').add({ data: { _id: 'cardNo', seq: 1 } });
      }
      const cardRes = await tx.collection('cards').add({ data: { ...cardBase, cardNo } });
      await tx.collection('users').doc(user._id).update({ data: { balls: _.inc(-1), totalCaught: _.inc(1), updatedAt: now } });
      await tx.collection('catches_log').add({ data: {
        openid, fileID, location: location || null, aiCostEstimate: 0.22,
        result: 'card', rarity, consumedBall: true, createdAt: now,
      }});
      return { _id: cardRes._id, cardNo };
    });

    // 异步触发重绘：云函数不能直接 fire-and-forget 调另一个。
    // MVP 策略：getCardDetail 懒触发（见 Task 12）。这里仅返回骨架卡。
    return { ok: true, data: { result: 'card', card: { _id: ret._id, cardNo: ret.cardNo, ...cardBase } } };
  } catch (e) {
    return { ok: false, error: 'txn-failed', detail: String(e) };
  }
};
```

`cloudfunctions/catchPet/package.json`：依赖 `wx-server-sdk`。

- [ ] **Step 4: 上传测试**

上传 catchPet。`wx.cloud.uploadFile` 一张猫图拿 fileID，调 `catchPet({ fileID })`。
Expected: 返回骨架卡（artStatus:'pending', artPhoto=originPhoto），balls -1，cards +1。
传非猫图 Expected: `{ result:'reject' }`，balls 不变。

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/catchPet
git commit -m "feat: catchPet 核心原子事务（识别+骨架卡+扣道具，友好失败不扣球）"
```

---

## Task 10: genCardArtTask 云函数（后台重绘）

**Files:**
- Create: `cloudfunctions/genCardArtTask/index.js`、`package.json`
- 同步 shared：`types`、`rarity-engine`（无需）、`art-provider`、`balls-recovery`（无需）→ 仅 art-provider + types

- [ ] **Step 1: 同步 shared 到 genCardArtTask**

Run: `cd E:/cutcat && npm run sync:shared -- genCardArtTask`
Expected: `cloudfunctions/genCardArtTask/{art-provider,types}.js` 生成。

- [ ] **Step 2: 实现 `genCardArtTask/index.js`**

```js
// cloudfunctions/genCardArtTask/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { generateCardArt } = require('./art-provider');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

/**
 * 后台重绘：被 getCardDetail 懒触发，或定时器触发。
 * 输入 { cardId }。从 card 读 originPhoto/rarity/识别信息，调 art-provider，写回 artPhoto/artStatus。
 */
exports.main = async (event) => {
  const { cardId } = event;
  if (!cardId) return { ok: false, error: 'no-card' };
  const c = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  const card = c.data;
  if (!card) return { ok: false, error: 'not-found' };
  if (card.artStatus === 'done') return { ok: true, skipped: 'already-done' };

  // 标记处理中（防重复触发）：用 artStatus 字段，pending→processing 需扩展类型；MVP 简化直接处理
  const retryThreshold = await getConfig('artgen_retry_threshold', 0.5);
  try {
    let out = await generateCardArt({
      originFileID: card.originPhoto,
      rarity: card.rarity,
      recognize: { isPet: true, petType: card.petType, furColor: card.furColor, featureScore: 50, qualityScore: 50, aiScore: 50 },
    });
    // 质量兜底：分数过低重试一次
    if (out.qualityScore < retryThreshold) {
      const out2 = await generateCardArt({
        originFileID: card.originPhoto, rarity: card.rarity,
        recognize: { isPet: true, petType: card.petType, furColor: card.furColor, featureScore: 50, qualityScore: 50, aiScore: 50 },
      });
      if (out2.qualityScore > out.qualityScore) out = out2;
    }
    await db.collection('cards').doc(cardId).update({ data: { artPhoto: out.artFileID, artStatus: 'done' } });
    return { ok: true, artPhoto: out.artFileID };
  } catch (e) {
    await db.collection('cards').doc(cardId).update({ data: { artStatus: 'failed' } });
    return { ok: false, error: 'artgen-failed', detail: String(e) };
  }
};
```

> **卡名/文案**：已在 catchPet（Task 9）的 `genCardMeta` 生成，genCardArtTask 只负责重绘图，不再生成文字。

- [ ] **Step 3: 上传测试**

手动调 `genCardArtTask({ cardId: '某pending卡id' })`（mock 模式下 artFileID=原图，artStatus→done）。
Expected: 卡片 artStatus 变 done。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/genCardArtTask
git commit -m "feat: genCardArtTask 后台重绘（ControlNet，质量兜底重试）"
```

---

## Task 11: genCardArt 云函数（用户主动重生成）

**Files:**
- Create: `cloudfunctions/genCardArt/index.js`、`package.json`
- 同步 shared：art-provider + types

- [ ] **Step 1: 同步 shared**

Run: `cd E:/cutcat && npm run sync:shared -- genCardArt`

- [ ] **Step 2: 实现**

```js
// cloudfunctions/genCardArt/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { generateCardArt } = require('./art-provider');

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  if (!cardId) return { ok: false, error: 'no-card' };

  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  if (u.data[0].balls <= 0) return { ok: false, error: 'no-balls' };

  const c = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  const card = c.data;
  if (!card || card.ownerOpenid !== openid) return { ok: false, error: 'forbidden' };

  try {
    const out = await generateCardArt({
      originFileID: card.originPhoto, rarity: card.rarity,
      recognize: { isPet: true, petType: card.petType, furColor: card.furColor, featureScore: 50, qualityScore: 50, aiScore: 50 },
    });
    await db.runTransaction(async tx => {
      await tx.collection('cards').doc(cardId).update({ data: { artPhoto: out.artFileID, artStatus: 'done' } });
      await tx.collection('users').doc(u.data[0]._id).update({ data: { balls: _.inc(-1), updatedAt: Date.now() } });
    });
    return { ok: true, artPhoto: out.artFileID };
  } catch (e) {
    return { ok: false, error: 'artgen-failed', detail: String(e) };
  }
};
```

- [ ] **Step 3: 上传测试**

Expected: 返回新 artPhoto，balls -1。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/genCardArt
git commit -m "feat: genCardArt 用户主动重生成卡面（消耗道具）"
```

---

## Task 12: getDex 与 getCardDetail 云函数

**Files:**
- Create: `cloudfunctions/getDex/`、`cloudfunctions/getCardDetail/`
- getCardDetail 同步 shared：无需（纯 DB 操作）

- [ ] **Step 1: 实现 getDex**

```js
// cloudfunctions/getDex/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const ORDER = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { page = 1, pageSize = 20, sortBy = 'time' } = event;
  const skip = (page - 1) * pageSize;
  const total = (await db.collection('cards').where({ ownerOpenid: openid }).count()).total;
  let cards = [];
  if (sortBy === 'rarity') {
    const all = await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').limit(100).get();
    cards = all.data.sort((a, b) => (ORDER[b.rarity] || 0) - (ORDER[a.rarity] || 0))
      .slice(skip, skip + pageSize);
  } else {
    cards = (await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()).data;
  }
  return { ok: true, cards, total, page, pageSize };
};
```

- [ ] **Step 2: 实现 getCardDetail（含懒触发重绘）**

```js
// cloudfunctions/getCardDetail/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  const r = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  if (!r.data) return { ok: false, error: 'not-found' };
  const card = r.data;

  // 懒触发重绘：artStatus==='pending' 且距创建超过 3s（避免与 catchPet 竞态）→ 触发 genCardArtTask
  if (card.artStatus === 'pending' && Date.now() - card.createdAt > 3000) {
    try {
      await cloud.callFunction({ name: 'genCardArtTask', data: { cardId } });
      // 重新读一次（重绘 mock 是同步的，真实可能仍 pending）
      const r2 = await db.collection('cards').doc(cardId).get().catch(() => ({ data: card }));
      const fresh = r2.data || card;
      return { ok: true, card: maskLocation(fresh, fresh.ownerOpenid === openid) };
    } catch (e) {
      // 触发失败也返回当前状态，前端继续轮询
    }
  }
  return { ok: true, card: maskLocation(card, card.ownerOpenid === openid) };
};

function maskLocation(card, isOwner) {
  if (!card.caughtLocation) return card;
  return { ...card, caughtLocation: isOwner ? card.caughtLocation : { publicArea: card.caughtLocation.publicArea } };
}
```

- [ ] **Step 3: 上传测试**

Expected: getDex 返回本人卡片；getCardDetail 本人见完整坐标，非本人仅 publicArea；pending 卡触发重绘后 artStatus→done。

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/getDex cloudfunctions/getCardDetail
git commit -m "feat: getDex 分页图鉴 + getCardDetail（隐私隔离 + 懒触发重绘）"
```

---

## Task 13: 前端服务封装（CloudService + WxService）

**Files:**
- Create: `assets/scripts/services/CloudService.ts`、`assets/scripts/services/WxService.ts`

- [ ] **Step 1: 实现 CloudService**

```ts
// assets/scripts/services/CloudService.ts
import { Card, UserDoc, Rarity, ArtStatus, CatchLocation } from '../core/Types';

interface Resp<T> { ok: boolean; data?: T; error?: string; [k: string]: any; }

function call<T = any>(name: string, data?: any): Promise<Resp<T>> {
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name, data,
      success: (res) => resolve(res.result as Resp<T>),
      fail: (err: any) => resolve({ ok: false, error: err.errMsg || 'cloud-failed' }),
    });
  });
}

export const CloudService = {
  login: () => call<{ user: UserDoc }>('login'),
  getProfile: () => call<{ user: UserDoc }>('getProfile'),
  recoverBalls: () => call<{ balls: number; recovered: number }>('recoverBalls'),
  catchPet: (fileID: string, location: CatchLocation | null) =>
    call<{ result: 'card' | 'reject'; card?: Card; reason?: string }>('catchPet', { fileID, location }),
  genCardArt: (cardId: string) => call<{ artPhoto: string }>('genCardArt', { cardId }),
  getDex: (page = 1, sortBy: 'time' | 'rarity' = 'time') =>
    call<{ cards: Card[]; total: number }>('getDex', { page, sortBy }),
  getCardDetail: (cardId: string) => call<{ card: Card }>('getCardDetail', { cardId }),
};
```

- [ ] **Step 2: 实现 WxService（拍照/定位/上传）**

```ts
// assets/scripts/services/WxService.ts
import { CatchLocation } from '../core/Types';

export const WxService = {
  /** 拍照/选图，返回临时路径 */
  chooseImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1, sourceType: ['camera', 'album'],
        success: (res) => resolve(res.tempFilePaths[0]),
        fail: reject,
      });
    });
  },

  /** 上传到云存储，返回 fileID */
  upload(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `catch/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`,
        filePath: filePath,
        success: (res) => resolve(res.fileID),
        fail: reject,
      });
    });
  },

  /** 获取定位，拒绝返回 null */
  getLocation(): Promise<CatchLocation | null> {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => resolve({ lat: res.latitude, lng: res.longitude, publicArea: '我的位置' }),
        fail: () => resolve(null),
      });
    });
  },

  showToast(title: string, icon: 'none' | 'success' = 'none') {
    wx.showToast({ title, icon });
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add assets/scripts/services
git commit -m "feat: 前端服务封装 CloudService + WxService"
```

---

## Task 14: UI 组件（CardView / RarityBadge / BallCounter）

**Files:**
- Create: `assets/scripts/ui/CardView.ts`、`RarityBadge.ts`、`BallCounter.ts`、`utils/colors.ts`

- [ ] **Step 1: 实现 `utils/colors.ts`（稀有度配色）**

```ts
// assets/scripts/utils/colors.ts
import { Rarity } from '../core/Types';

export interface RarityStyle { name: string; color: cc.Color; bg: cc.Color; }

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  N:   { name: '普通', color: new cc.Color(180, 180, 180), bg: new cc.Color(85, 85, 85) },
  R:   { name: '稀有', color: new cc.Color(120, 180, 255), bg: new cc.Color(30, 111, 184) },
  SR:  { name: '超稀有', color: new cc.Color(200, 140, 255), bg: new cc.Color(107, 63, 160) },
  SSR: { name: '传说', color: new cc.Color(255, 215, 0), bg: new cc.Color(212, 175, 55) },
  UR:  { name: '幻兽', color: new cc.Color(255, 120, 200), bg: new cc.Color(255, 94, 94) },
};
```

- [ ] **Step 2: 实现 `RarityBadge.ts`**

```ts
// assets/scripts/ui/RarityBadge.ts
import { _decorator, Label, Sprite, Component } from 'cc';
import { Rarity } from '../core/Types';
import { RARITY_STYLE } from '../utils/colors';
const { ccclass, property } = _decorator;

@ccclass('RarityBadge')
export class RarityBadge extends Component {
  @property(Label) label: Label | null = null;
  @property(Sprite) bg: Sprite | null = null;

  setRarity(rarity: Rarity) {
    const s = RARITY_STYLE[rarity];
    if (this.label) this.label.string = s.name;
    if (this.bg) this.bg.color = s.bg;
  }
}
```

- [ ] **Step 3: 实现 `CardView.ts`**

```ts
// assets/scripts/ui/CardView.ts
import { _decorator, Sprite, SpriteFrame, Label, Component, tween, Vec3, UIOpacity } from 'cc';
import { Card } from '../core/Types';
const { ccclass, property } = _decorator;

@ccclass('CardView')
export class CardView extends Component {
  @property(Sprite) art: Sprite | null = null;       // 卡面
  @property(Label) name: Label | null = null;
  @property(Label) rarity: Label | null = null;

  private _card: Card | null = null;
  get card() { return this._card; }

  bind(card: Card) {
    this._card = card;
    if (this.name) this.name.string = card.name || `#${card.cardNo}`;
    if (this.rarity) this.rarity.string = card.rarity;
    this.loadArt(card.artPhoto);
  }

  /** 卡面升级（原图→AI重绘图）：淡出淡入 */
  upgradeArt(newFileID: string) {
    const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
    tween(op).to(0.3, { opacity: 0 }).call(() => {
      this.loadArt(newFileID, () => {
        tween(op).to(0.3, { opacity: 255 }).start();
      });
    }).start();
  }

  private loadArt(fileID: string, cb?: () => void) {
    if (!this.art) { cb?.(); return; }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        const img = new Image();
        img.onload = () => {
          const tex = new cc.Texture2D();
          tex.reset({ width: img.width, height: img.height, format: cc.Texture2D.PixelFormat.RGB888 });
          tex.uploadData(img);
          tex.upload(); // 实际 API 见 Cocos 版本，可能用 imageData
          const sf = new SpriteFrame(tex);
          this.art!.spriteFrame = sf;
          cb?.();
        };
        img.src = res.tempFilePath;
      },
      fail: () => cb?.(),
    });
  }
}
```

> **注**：Cocos 3.8 从 wx 临时图加载纹理的精确 API（`Texture2D`/`ImageAsset`）以编辑器实际为准，此处给出结构，执行时按 Cocos 文档 `ImageAsset` + `Texture2D` 路径调整 `loadArt` 内部。

- [ ] **Step 4: 实现 `BallCounter.ts`**

```ts
// assets/scripts/ui/BallCounter.ts
import { _decorator, Label, Component, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BallCounter')
export class BallCounter extends Component {
  @property(Label) label: Label | null = null;
  private _balls = 0;

  setBalls(n: number) {
    const prev = this._balls;
    this._balls = n;
    if (this.label) this.label.string = `捕捉球 × ${n}`;
    if (n < prev) {
      // 扣球弹跳反馈
      tween(this.node).to(0.1, { scale: new Vec3(1.2, 1.2, 1) }).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add assets/scripts/ui assets/scripts/utils
git commit -m "feat: UI 组件 CardView/RarityBadge/BallCounter + 配色表"
```

---

## Task 15: 动画组件（CardFlipAnim / RarityBurst / CatchAnim）

**Files:**
- Create: `assets/scripts/ui/CardFlipAnim.ts`、`RarityBurst.ts`、`CatchAnim.ts`

> 这是"动画炫酷"的核心。翻卡用 tween 3D 翻转，稀有度光效用粒子（高稀有度需在编辑器配 ParticleSystem）。

- [ ] **Step 1: 实现 `CardFlipAnim.ts`（3D 翻转）**

```ts
// assets/scripts/ui/CardFlipAnim.ts
import { _decorator, Node, tween, Vec3, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CardFlipAnim')
export class CardFlipAnim extends Component {
  @property(Node) cardBack: Node | null = null;   // 卡背
  @property(Node) cardFront: Node | null = null;  // 卡面

  /** 翻卡：先转 90°（藏卡背），换面，再转回 0°（显卡面） */
  flip(onMid?: () => void) {
    if (!this.cardFront || !this.cardBack) return;
    this.cardFront.active = false;
    this.cardBack.active = true;
    tween(this.node)
      .to(0.25, { eulerAngles: new Vec3(0, 90, 0) })
      .call(() => {
        this.cardBack.active = false;
        this.cardFront.active = true;
        onMid?.();
      })
      .to(0.25, { eulerAngles: new Vec3(0, 0, 0) })
      .start();
  }
}
```

- [ ] **Step 2: 实现 `RarityBurst.ts`（稀有度光效触发）**

```ts
// assets/scripts/ui/RarityBurst.ts
import { _decorator, ParticleSystem, Node, Component } from 'cc';
import { Rarity } from '../core/Types';
const { ccclass, property } = _decorator;

@ccclass('RarityBurst')
export class RarityBurst extends Component {
  // 在编辑器里为每个稀有度挂一个粒子节点（SSR 金粒子、UR 全屏彩虹爆裂）
  @property(Node) ssrBurst: Node | null = null;
  @property(Node) urBurst: Node | null = null;

  play(rarity: Rarity) {
    if (rarity === 'SSR' && this.ssrBurst) {
      this.ssrBurst.active = true;
      this.ssrBurst.getComponent(ParticleSystem)?.play();
    }
    if (rarity === 'UR' && this.urBurst) {
      this.urBurst.active = true;
      this.urBurst.getComponent(ParticleSystem)?.play();
      // UR 额外震屏
    }
    // N/R/SR 暂用简单缩放反馈（可后续加粒子）
  }
}
```

- [ ] **Step 3: 实现 `CatchAnim.ts`（捕捉中旋转球）**

```ts
// assets/scripts/ui/CatchAnim.ts
import { _decorator, Node, tween, Vec3, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CatchAnim')
export class CatchAnim extends Component {
  @property(Node) ball: Node | null = null;

  play() {
    if (!this.ball) return;
    // 持续旋转，stop() 时停
    tween(this.ball).by(1, { eulerAngles: new Vec3(0, 0, 360) }).repeatForever().start();
    this.node.active = true;
  }
  stop() { this.node.active = false; }
}
```

- [ ] **Step 4: Commit**

```bash
git add assets/scripts/ui/CardFlipAnim.ts assets/scripts/ui/RarityBurst.ts assets/scripts/ui/CatchAnim.ts
git commit -m "feat: 动画组件 翻卡3D翻转/稀有度粒子光效/捕捉旋转球"
```

---

## Task 16: 三个 Panel + TabBar

**Files:**
- Create: `assets/scripts/panels/CatchPanel.ts`、`DexPanel.ts`、`ProfilePanel.ts`、`assets/scripts/ui/TabBar.ts`、`assets/scripts/core/GameState.ts`、`core/EventManager.ts`

- [ ] **Step 1: 实现 `core/EventManager.ts`（事件总线）**

```ts
// assets/scripts/core/EventManager.ts
type Handler = (data?: any) => void;
class Emitter {
  private map = new Map<string, Handler[]>();
  on(evt: string, h: Handler) { (this.map.get(evt) || this.map.set(evt, []).get(evt)!).push(h); }
  off(evt: string, h: Handler) {
    const arr = this.map.get(evt); if (!arr) return;
    const i = arr.indexOf(h); if (i >= 0) arr.splice(i, 1);
  }
  emit(evt: string, data?: any) { this.map.get(evt)?.forEach(h => h(data)); }
}
export const EventManager = new Emitter();
export const EVT = { ART_READY: 'art-ready', BALLS_CHANGED: 'balls-changed' };
```

- [ ] **Step 2: 实现 `core/GameState.ts`**

```ts
// assets/scripts/core/GameState.ts
import { UserDoc } from './Types';
export const GameState = {
  user: null as UserDoc | null,
  setUser(u: UserDoc | null) { this.user = u; },
  get balls() { return this.user?.balls ?? 0; },
};
```

- [ ] **Step 3: 实现 `CatchPanel.ts`（核心仪式感流程）**

```ts
// assets/scripts/panels/CatchPanel.ts
import { _decorator, Node, Component, find } from 'cc';
import { CloudService } from '../services/CloudService';
import { WxService } from '../services/WxService';
import { GameState } from '../core/GameState';
import { Card } from '../core/Types';
import { CardView } from '../ui/CardView';
import { CardFlipAnim } from '../ui/CardFlipAnim';
import { CatchAnim } from '../ui/CatchAnim';
import { RarityBurst } from '../ui/RarityBurst';
import { BallCounter } from '../ui/BallCounter';
const { ccclass, property } = _decorator;

@ccclass('CatchPanel')
export class CatchPanel extends Component {
  @property(Node) catchAnimNode: Node | null = null;
  @property(Node) resultNode: Node | null = null;     // 卡牌展示节点
  @property(Node) flipNode: Node | null = null;
  @property(Node) burstNode: Node | null = null;
  @property(Node) ballCounterNode: Node | null = null;
  @property(Node) pendingHintNode: Node | null = null; // "卡面生成中..."

  private catching = false;

  async onShow() {
    await CloudService.recoverBalls();
    const p = await CloudService.getProfile();
    if (p.ok && p.data?.user) {
      GameState.setUser(p.data.user);
      this.ballCounterNode?.getComponent(BallCounter)?.setBalls(GameState.balls);
    }
  }

  async onCatchBtn() {
    if (this.catching) return;
    if (GameState.balls <= 0) { WxService.showToast('捕捉球用完了，稍后再来'); return; }
    this.catching = true;
    try {
      const tempPath = await WxService.chooseImage();
      this.catchAnimNode?.getComponent(CatchAnim)?.play();
      const fileID = await WxService.upload(tempPath);
      const location = await WxService.getLocation();
      const r = await CloudService.catchPet(fileID, location);
      this.catchAnimNode?.getComponent(CatchAnim)?.stop();
      if (!r.ok) { WxService.showToast('捕捉失败'); return; }
      const d = r.data!;
      if (d.result === 'reject') {
        WxService.showToast('没找到猫猫气息～换一张试试');
        return;
      }
      // 高潮1：翻卡（原图占位）
      const card = d.card!;
      this.showCardFlip(card);
      this.ballCounterNode?.getComponent(BallCounter)?.setBalls(GameState.balls);
      // 异步轮询卡面升级
      this.pollArtUpgrade(card._id);
    } catch (e) {
      this.catchAnimNode?.getComponent(CatchAnim)?.stop();
      WxService.showToast('出错了');
    } finally {
      this.catching = false;
    }
  }

  private showCardFlip(card: Card) {
    this.resultNode?.getComponent(CardView)?.bind(card);
    this.flipNode?.getComponent(CardFlipAnim)?.flip(() => {
      this.burstNode?.getComponent(RarityBurst)?.play(card.rarity);
    });
  }

  /** 轮询 artStatus，done 时卡面升级（高潮2） */
  private async pollArtUpgrade(cardId: string) {
    this.pendingHintNode && (this.pendingHintNode.active = true);
    for (let i = 0; i < 30; i++) {  // 最多轮询约 60s
      await new Promise(r => setTimeout(r, 2000));
      const r = await CloudService.getCardDetail(cardId);
      const card = r.data?.card;
      if (card && card.artStatus === 'done') {
        this.pendingHintNode && (this.pendingHintNode.active = false);
        this.resultNode?.getComponent(CardView)?.upgradeArt(card.artPhoto);
        this.burstNode?.getComponent(RarityBurst)?.play(card.rarity);
        return;
      }
      if (card && card.artStatus === 'failed') {
        this.pendingHintNode && (this.pendingHintNode.active = false);
        WxService.showToast('卡面生成失败，可在详情重生成');
        return;
      }
    }
    this.pendingHintNode && (this.pendingHintNode.active = false);
  }
}
```

- [ ] **Step 4: 实现 `DexPanel.ts`**

```ts
// assets/scripts/panels/DexPanel.ts
import { _decorator, Node, Prefab, instantiate, Component } from 'cc';
import { CloudService } from '../services/CloudService';
import { Card } from '../core/Types';
import { CardView } from '../ui/CardView';
const { ccclass, property } = _decorator;

@ccclass('DexPanel')
export class DexPanel extends Component {
  @property(Node) grid: Node | null = null;
  @property(Prefab) cardPrefab: Prefab | null = null;
  private sortBy: 'time' | 'rarity' = 'time';

  async onShow() {
    this.grid?.removeAllChildren();
    const r = await CloudService.getDex(1, this.sortBy);
    if (!r.ok || !r.data?.cards) return;
    for (const card of r.data.cards) {
      const node = instantiate(this.cardPrefab!);
      node.getComponent(CardView)?.bind(card);
      node.on('click', () => this.openDetail(card._id));
      this.grid?.addChild(node);
    }
  }

  toggleSort() { this.sortBy = this.sortBy === 'time' ? 'rarity' : 'time'; this.onShow(); }
  private openDetail(id: string) { /* Task 18 弹窗 */ }
}
```

- [ ] **Step 5: 实现 `ProfilePanel.ts`**

```ts
// assets/scripts/panels/ProfilePanel.ts
import { _decorator, Label, Component } from 'cc';
import { CloudService } from '../services/CloudService';
import { GameState } from '../core/GameState';
const { ccclass, property } = _decorator;

@ccclass('ProfilePanel')
export class ProfilePanel extends Component {
  @property(Label) ballsLabel: Label | null = null;
  @property(Label) totalLabel: Label | null = null;
  @property(Label) memberLabel: Label | null = null;

  async onShow() {
    const r = await CloudService.getProfile();
    if (!r.ok || !r.data?.user) return;
    const u = r.data.user;
    GameState.setUser(u);
    if (this.ballsLabel) this.ballsLabel.string = `${u.balls} / ${u.ballsMax}`;
    if (this.totalLabel) this.totalLabel.string = `${u.totalCaught}`;
    if (this.memberLabel) this.memberLabel.string = u.membership ? 'VIP' : '未开通';
  }
}
```

- [ ] **Step 6: 实现 `TabBar.ts`**

```ts
// assets/scripts/ui/TabBar.ts
import { _decorator, Node, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TabBar')
export class TabBar extends Component {
  @property(Node) catchPanel: Node | null = null;
  @property(Node) dexPanel: Node | null = null;
  @property(Node) profilePanel: Node | null = null;
  private current: Node | null = null;

  onLoad() { this.switchTo('catch'); }

  switchTo(name: 'catch' | 'dex' | 'profile') {
    const panels = { catch: this.catchPanel, dex: this.dexPanel, profile: this.profilePanel };
    Object.values(panels).forEach(p => p && (p.active = false));
    const target = panels[name];
    if (target) { target.active = true; this.current = target; (target as any).getComponent(name === 'catch' ? 'CatchPanel' : name === 'dex' ? 'DexPanel' : 'ProfilePanel')?.onShow(); }
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add assets/scripts/panels assets/scripts/ui/TabBar.ts assets/scripts/core
git commit -m "feat: 三 Panel(Catch/Dex/Profile) + TabBar + 全局状态/事件总线"
```

---

## Task 17: MainScene 场景搭建（编辑器操作）

**Files:**
- 创建/编辑：`assets/scenes/MainScene.scene`（编辑器内搭建节点树）

> 本任务为 Cocos 编辑器操作，脚本已就绪，需在编辑器里挂组件、连引用。

- [ ] **Step 1: 创建 MainScene（编辑器）**

Cocos 编辑器 → assets/scenes 右键 → 新建 Scene → 命名 `MainScene`。

- [ ] **Step 2: 搭建节点树（编辑器）**

```
MainScene (Canvas)
├── Bg (Sprite: 深色背景 #0f0f1e)
├── BallCounter (Label + 挂 BallCounter.ts，引用 label)
├── CatchPanel (空节点 + 挂 CatchPanel.ts)
│   ├── CatchBtn (Button + 挂 CatchPanel.onCatchBtn 到 ClickEvents)
│   ├── CatchAnimNode (挂 CatchAnim.ts，含 ball 子节点)
│   ├── FlipNode (挂 CardFlipAnim.ts，含 cardBack/cardFront 子节点)
│   ├── ResultNode (挂 CardView.ts，含 art/name/rarity 子节点)
│   ├── BurstNode (挂 RarityBurst.ts，含 ssrBurst/urBurst 粒子子节点)
│   └── PendingHintNode (Label "卡面生成中...")
├── DexPanel (空节点 + 挂 DexPanel.ts，含 grid 子节点) [默认 active=false]
├── ProfilePanel (空节点 + 挂 ProfilePanel.ts，含 labels) [默认 active=false]
└── TabBar (3 Button: 捕捉/图鉴/我的，ClickEvents 连 TabBar.switchTo)
```

- [ ] **Step 3: 配置粒子特效（编辑器，SSR/UR）**

为 BurstNode 下：
- `ssrBurst`：加 ParticleSystem 组件，金色粒子，startColor #ffd700，喷射模式，默认 active=false
- `urBurst`：加 ParticleSystem，多色彩虹（可用多个粒子或颜色渐变），全屏范围爆裂，默认 active=false

- [ ] **Step 4: 创建卡牌预制体 `assets/prefabs/Card.prefab`（编辑器）**

节点：Card (挂 CardView.ts) → art(Sprite) + name(Label) + rarity(Label) + RarityBadge。

- [ ] **Step 5: 预览验证（编辑器运行）**

Cocos 编辑器运行 MainScene。
Expected: 看到 3 个 Tab、捕获面板、道具计数；点捕捉按钮触发选图（编辑器内 wx API 可能受限，需真机/微信工具验证完整流程）。

- [ ] **Step 6: Commit**

```bash
git add assets/scenes assets/prefabs
git commit -m "feat: MainScene 场景搭建 + 卡牌预制体 + 粒子特效"
```

---

## Task 18: 详情弹窗（CardDetailModal）

**Files:**
- Create: `assets/scripts/scenes/CardDetailModal.ts`、`assets/prefabs/CardDetailModal.prefab`（编辑器）

- [ ] **Step 1: 实现 `CardDetailModal.ts`**

```ts
// assets/scripts/scenes/CardDetailModal.ts
import { _decorator, Node, Component, find } from 'cc';
import { CloudService } from '../services/CloudService';
import { WxService } from '../services/WxService';
import { Card } from '../core/Types';
import { CardView } from '../ui/CardView';
import { RarityBadge } from '../ui/RarityBadge';
import { GameState } from '../core/GameState';
const { ccclass, property } = _decorator;

@ccclass('CardDetailModal')
export class CardDetailModal extends Component {
  @property(Node) cardViewNode: Node | null = null;
  @property(Node) badgeNode: Node | null = null;
  private cardId: string = '';

  async open(cardId: string) {
    this.cardId = cardId;
    this.node.active = true;
    const r = await CloudService.getCardDetail(cardId);
    if (!r.ok || !r.data?.card) return;
    const card = r.data.card;
    this.cardViewNode?.getComponent(CardView)?.bind(card);
    this.badgeNode?.getComponent(RarityBadge)?.setRarity(card.rarity);
  }

  async onRegenBtn() {
    if (GameState.balls <= 0) { WxService.showToast('捕捉球不足'); return; }
    const r = await CloudService.genCardArt(this.cardId);
    if (r.ok && r.data?.artPhoto) {
      this.cardViewNode?.getComponent(CardView)?.upgradeArt(r.data.artPhoto);
      const p = await CloudService.getProfile();
      if (p.ok && p.data?.user) GameState.setUser(p.data.user);
    } else {
      WxService.showToast('重生成失败');
    }
  }

  onShareBtn() { WxService.showToast('分享开发中'); }
  onCloseBtn() { this.node.active = false; }
}
```

- [ ] **Step 2: 创建预制体并接入 DexPanel（编辑器 + 代码）**

编辑器建 `CardDetailModal.prefab`（节点树：背景遮罩 + 卡牌区 + 按钮），挂 CardDetailModal.ts 连引用。
修改 `DexPanel.openDetail`：

```ts
import { CardDetailModal } from '../scenes/CardDetailModal';
// DexPanel 增加 @property(Prefab) detailPrefab
private openDetail(id: string) {
  const node = instantiate(this.detailPrefab!);
  this.node.parent!.addChild(node);
  node.getComponent(CardDetailModal)?.open(id);
}
```

- [ ] **Step 3: 预览验证**

Expected: 图鉴点卡 → 弹详情，本人见地点，重生成扣道具刷新卡面。

- [ ] **Step 4: Commit**

```bash
git add assets/scripts/scenes/CardDetailModal.ts assets/prefabs assets/scripts/panels/DexPanel.ts
git commit -m "feat: 卡片详情弹窗（隐私地点 + 重生成卡面）"
```

---

## Task 19: 联调与验收

**Files:** 全项目；对照 spec 第 9 节。

- [ ] **Step 1: 上传全部云函数**

8 个云函数逐一"上传并部署：云端安装依赖"。
Expected: 云函数列表全部正常。

- [ ] **Step 2: 跑单测回归**

Run: `cd E:/cutcat && npm test`
Expected: 11 个 test 全 PASS（恢复 5 + 稀有度 6）。

- [ ] **Step 3: Cocos 构建微信小游戏**

Cocos 编辑器 → 项目 → 构建发布 → 平台"微信小游戏" → AppID `wx5f2be181d74900e1` → 构建。
产物在 `build/wechatgame/`。

- [ ] **Step 4: 微信开发者工具打开并真机预览**

微信开发者工具打开 `build/wechatgame/`（用 `project.config.json`）。
配置云开发环境 `cloudbase-d0gm6j7hqbc346db6`。
真机扫码预览。

- [ ] **Step 5: 端到端走查（对照 spec 验收标准 1-10）**

1. 完整闭环：拍照→重绘(artStatus pending→done)→图鉴可见 ✓
2. 球消耗：成功 -1，非宠物不扣 ✓
3. 道具恢复：改 ballsRecoveredAt 到 5h 前，重进，球 +1 余数保留 ✓
4. 稀有度五档分布合理 ✓
5. **AI 重绘一致性**：生成卡仍能辨认原猫（ControlNet 生效）✓
6. **动画炫酷**：翻卡 + SSR/UR 粒子光效显著 ✓
7. 卡片记录齐全，地点隐私隔离 ✓
8. AI Key 不在前端 ✓
9. catches_log 每次有记录含成本 ✓
10. 单测全绿 ✓

- [ ] **Step 6: 修复并提交**

```bash
git add -A && git commit -m "chore: 联调修复与验收核对"
git tag -a v0.1.0-mvp -m "pawcard MVP 完成"
```

---

## 后续（Phase 2/3 占位，不在本计划内）

- Phase 2：社交展示/交换/赠送、同一只猫"再次相遇"养成（用 `catches_log.result:'dup'`）、地图社交
- Phase 3：交易市场（合规/风控/支付）
- 全程：将 `recognize.js` 与 `art-provider.ts` 的 mock 替换为真实微信 AI + 云端图生图 API
- 真实卡名生成：在 catchPet 或 genCardArtTask 接多模态模型按毛色/稀有度生成卡名
