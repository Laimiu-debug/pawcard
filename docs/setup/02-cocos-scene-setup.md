# Cocos Creator 场景搭建指引（防错版）

> ⚠️ 本步骤必须在 **Cocos Creator 3.8.x 编辑器** GUI 中完成，无法用命令行产出。
> 所有脚本已写好（`assets/scripts/`），本文档把脚本挂到节点、连引用、配粒子。
> **照着一步步做，每个"常见坑"都列了**。

---

## 预备知识（避免反复返工）

1. **挂脚本**：把 `assets/scripts/...` 里的 `.ts` 文件**拖到节点的属性检查器（右侧面板）**，会自动加为组件。
2. **连引用（@property）**：脚本组件属性里有个圆圈 ○，点一下变蓝，再**从层级面板拖目标节点到圆圈**；或直接把目标节点拖到属性框。
3. **节点必须先建好才能被引用**——所以按本文档**从上到下顺序**建，避免引用找不到目标。
4. **改了脚本要等编辑器编译完**（底部状态栏转圈结束）才能挂载。

---

## Step 0：打开项目 + 等编译

1. Cocos Dashboard → 打开本地项目 → 选 `E:\cutcat`
2. 若提示缺项目文件（没有 `.creator/`、`settings/`、`assets/` 里有 `.meta`）：
   - Dashboard 新建 Empty(2D) 项目到**临时目录**
   - 把临时目录的 `settings/` 复制进 `E:\cutcat`
   - 删掉临时项目，重新打开 `E:\cutcat`
3. 打开后**等底部状态栏"编译"完成**（脚本会生成 .meta，之后才能挂载）
4. ✅ 验证：任选 `assets/scripts/ui/BallCounter.ts`，属性检查器能看到类名，无红线报错

---

## Step 1：建 MainScene

- `assets/scenes/` 文件夹右键 → 新建 → Scene → 命名 `MainScene` → 回车
- **双击** MainScene 打开（层级面板应出现 Canvas）

---

## Step 2：建背景（最简单的，先练手）

层级面板 `Canvas` 右键 → 创建 → **UI Components / Sprite**（或 2D → Sprite）→ 重命名 `Bg`
- 选中 Bg → 属性检查器 Sprite 组件 → **Color** 改成深色：R=15, G=15, B=30（#0F0F1E）
- Content Size：宽 720 高 1280（铺满）
- ✅ 验证：场景里看到一个深色背景

---

## Step 3：建道具计数器 BallCounter

`Canvas` 右键 → 创建 → 2D → **Label** → 重命名 `BallCounter`
- 选中 BallCounter → 属性检查器：
  - Label → String：`捕捉球 × 0`
  - **FontSize**：32
  - Color：黄 R=255 G=209 B=102
  - Position：X=0, Y=560（顶部）
- **挂脚本**：从 `assets/scripts/ui/` 把 `BallCounter.ts` 拖到 BallCounter 节点的属性检查器
- **连引用**：BallCounter 组件的 `Label` 属性 ○ → 拖 BallCounter 节点自己（因为 Label 组件就在自己身上）
  - ⚠️ 坑：拖自己时，确保拖到的是 Label 组件那一行的引用框，不是节点本身

---

## Step 4：建 CatchPanel（核心，节点最多）

`Canvas` 右键 → 创建空节点 → 重命名 `CatchPanel`

在 CatchPanel 下依次建这些子节点（**右键 CatchPanel → 创建**）：

### 4.1 CatchBtn（捕捉按钮）
- CatchPanel 右键 → 创建 → 2D → **Button** → 重命名 `CatchBtn`
- Button 下的 Label 子节点 String：`开始捕捉`
- 连事件：选中 CatchBtn → Button 组件 → **Click Events** → 数量改 1
  - 第 1 项拖入 `CatchPanel` 节点（target）
  - Component 选 `CatchPanel`（**必须先按 Step 4.7 挂好脚本，这里才能选到**）
  - Handler 选 `onCatchBtn`
  - ⚠️ 坑：Component 下拉没有 CatchPanel？说明脚本没挂或没编译完，回 Step 4.7

### 4.2 CatchAnimNode（旋转球动画）
- CatchPanel 右键 → 创建空节点 → 重命名 `CatchAnimNode`
- CatchAnimNode 下建子节点 `ball`（Label，String 填 `⚪`，FontSize 120）
- 挂 `CatchAnim.ts` 到 CatchAnimNode
- 连引用：CatchAnim 组件 `Ball` ○ → 拖 `ball` 子节点
- **默认 active 取消勾选**（捕捉时才显示）

### 4.3 FlipNode（翻卡动画）
- CatchPanel 右键 → 创建空节点 → 重命名 `FlipNode`
- FlipNode 下建两个子节点（都建 Sprite，重命名）：
  - `cardBack`：Sprite，加载任意图片资源当卡背（可先放张占位图），Content Size 420×560
  - `cardFront`：同上，作为卡面容器
- 挂 `CardFlipAnim.ts` 到 FlipNode
- 连引用：`CardBack` ○ → 拖 cardBack；`CardFront` ○ → 拖 cardFront

### 4.4 ResultNode（卡牌展示）
- CatchPanel 右键 → 创建空节点 → 重命名 `ResultNode`
- ResultNode 下建 3 个子节点：
  - `art`：Sprite（卡面图），Content Size 400×480
  - `name`：Label（卡名），FontSize 40，Color 黄
  - `rarity`：Label（稀有度），FontSize 28
- 挂 `CardView.ts` 到 ResultNode
- 连引用：`Art` ○ → 拖 art；`Name` ○ → 拖 name；`Rarity` ○ → 拖 rarity

### 4.5 BurstNode（稀有度光效）
- CatchPanel 右键 → 创建空节点 → 重命名 `BurstNode`
- BurstNode 下建两个子节点（空节点）：
  - `ssrBurst`：选中 → 属性检查器「添加组件」→ 搜 `ParticleSystem` → 加上
    - Start Color：R=255 G=215 B=0（金）
    - **Play On Load 取消勾选**
    - 默认 active 取消勾选
  - `urBurst`：同样加 ParticleSystem
    - 用颜色渐变或多色，范围调大（全屏爆裂）
    - **Play On Load 取消勾选**，默认 active 取消勾选
- 挂 `RarityBurst.ts` 到 BurstNode
- 连引用：`Ssr Burst` ○ → 拖 ssrBurst；`Ur Burst` ○ → 拖 urBurst
  - ⚠️ 坑：粒子参数不影响功能，调漂亮即可，先跑通再优化

### 4.6 PendingHintNode（卡面生成中提示）
- CatchPanel 右键 → 创建 → Label → 重命名 `PendingHintNode`
- String：`卡面生成中…`，FontSize 24，Color 白
- **默认 active 取消勾选**

### 4.7 挂 CatchPanel 脚本（放最后，引用都已就位）
- 把 `assets/scripts/panels/CatchPanel.ts` 拖到 CatchPanel 节点
- 连引用（全都是拖 Step 4 建的子节点）：
  - `Catch Anim Node` ○ → 拖 CatchAnimNode
  - `Result Node` ○ → 拖 ResultNode
  - `Flip Node` ○ → 拖 FlipNode
  - `Burst Node` ○ → 拖 BurstNode
  - `Ball Counter Node` ○ → 拖**顶层 BallCounter**（Step 3 建的）
  - `Pending Hint Node` ○ → 拖 PendingHintNode

---

## Step 5：建 DexPanel（图鉴）

- `Canvas` 右键 → 创建空节点 → 重命名 `DexPanel`
- DexPanel 右键 → 创建空节点 → 重命名 `grid`（卡牌网格容器）
- 挂 `DexPanel.ts` 到 DexPanel
- 连引用：`Grid` ○ → 拖 grid；`Card Prefab` ○ → **先空着**（Step 7 建好预制体再连）；`Detail Prefab` ○ → 先空着（Step 8）
- **DexPanel 节点默认 active 取消勾选**（默认显示捕捉面板）

---

## Step 6：建 ProfilePanel（我的）

- `Canvas` 右键 → 创建空节点 → 重命名 `ProfilePanel`
- 建 3 个 Label 子节点：`ballsLabel`（String `0/3`）、`totalLabel`（`0`）、`memberLabel`（`未开通`）
- 挂 `ProfilePanel.ts` → 连引用 Balls/Total/Member Label ○ → 对应子节点
- **默认 active 取消勾选**

---

## Step 7：建 TabBar + 连接三面板

- `Canvas` 右键 → 创建空节点 → 重命名 `TabBar`
- TabBar 下建 3 个 Button：`btnCatch`(String`捕捉`)、`btnDex`(`图鉴`)、`btnProfile`(`我的`)
  - Position：底部一排，如 Y=-560，X 分别 -240/0/240
- 挂 `TabBar.ts` 到 TabBar 节点
- 连引用：`Catch Panel` ○ → CatchPanel；`Dex Panel` ○ → DexPanel；`Profile Panel` ○ → ProfilePanel
- 连每个按钮事件：btnCatch → Button Click Events[0] → target 拖 TabBar → Component 选 TabBar → Handler 填 `switchTo` → **Custom Data 填 `catch`**
  - ⚠️ 坑：Custom Data 必须带引号 `'catch'`（字符串）；btnDex 填 `'dex'`，btnProfile 填 `'profile'`
  - ⚠️ 坑：switchTo 接收的是字符串参数，Custom Data 填的就是这个值

---

## Step 8：建 Card 预制体

- `assets/prefabs/`（没有就先建文件夹）右键 → 新建 → Prefab → 命名 `Card`
- 双击进入 Card 预制体编辑
- 根节点挂 `CardView.ts`
- 建 3 个子节点：`art`(Sprite 400×480)、`name`(Label)、`rarity`(Label)
- 连 CardView 的 Art/Name/Rarity ○ → 对应子节点
- 保存预制体（Ctrl+S）
- 回 MainScene，选中 DexPanel → `Card Prefab` ○ → 拖入 Card 预制体（从 assets/prefabs 拖）

---

## Step 9：建 CardDetailModal 预制体

- `assets/prefabs/` 右键 → 新建 Prefab → 命名 `CardDetailModal`
- 双击进入编辑
- 根节点挂 `CardDetailModal.ts`，**默认 active 取消勾选**
- 建子节点：
  - 背景遮罩：Sprite，Color 黑半透明（RGBA 0,0,0,180），铺满
  - `cardViewNode`：挂 CardView.ts + art/name/rarity 子节点
  - `badgeNode`：挂 RarityBadge.ts + Label 子节点
  - 3 个 Button：重生成(`onRegenBtn`)、分享(`onShareBtn`)、关闭(`onCloseBtn`)
- 连 CardDetailModal 的 `Card View Node` ○ → cardViewNode；`Badge Node` ○ → badgeNode
- 保存，回 MainScene，DexPanel → `Detail Prefab` ○ → 拖入 CardDetailModal 预制体

---

## Step 10：云开发初始化（在 MainScene 根 Canvas 挂初始化）

> 小游戏需在启动时 `wx.cloud.init`。建一个入口脚本挂场景。
- `assets/scripts/core/` 新建 `AppInit.ts`：

```typescript
// assets/scripts/core/AppInit.ts
import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('AppInit')
export class AppInit extends Component {
  onLoad() {
    if (typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-d0gm6j7hqbc346db6',
        traceUser: true,
      });
      console.log('wx.cloud initialized');
    } else {
      console.warn('wx.cloud not available (非微信环境)');
    }
  }
}
```

- 选中 Canvas → 挂 AppInit.ts

---

## Step 11：预览验证

编辑器顶部 ▶ 运行：
- ✅ 看到 Bg 深色背景、BallCounter「捕捉球 × 0」、底部 3 个 Tab
- ✅ 点图鉴 Tab → 切到 DexPanel（空网格，正常）
- ✅ 点捕捉 → 弹出 wx.chooseImage（编辑器内可能受限，需真机）

**编辑器内 wx API 多半不可用**，完整链路验证靠 Step 12。

---

## Step 12：构建 + 真机验证

1. 顶部菜单 项目 → 构建发布 → 平台选「微信小游戏」
2. AppID：`wx5f2be181d74900e1`
3. 构建 → 等产物生成（`build/wechatgame/`）
4. 微信开发者工具 → 打开 `build/wechatgame/`
5. 云开发面板确认环境 `cloudbase-d0gm6j7hqbc346db6`
6. 真机扫码预览，走完整捕捉流程

---

## 常见报错速查

| 报错 | 原因 | 解决 |
|---|---|---|
| `Component 下拉找不到 CatchPanel` | 脚本没编译完/没挂 | 等编译完成，确认 .ts 无红线 |
| `引用显示 None` | @property 没连 | 把目标节点拖到属性 ○ 框 |
| 运行后 Tab 切换无反应 | switchTo 的 Custom Data 没填或没引号 | 填 `'catch'` 等，带引号 |
| `wx is not defined` | 非微信环境运行 | 编辑器内正常，真机才生效 |
| 黑屏 | Canvas 相机缺失或 Bg 遮挡 | 确认 Canvas 有 Camera，Bg 在最下层 |
| 粒子不显示 | active 没开或粒子参数为 0 | RarityBurst.play 时会开 active，调粒子参数 |

---

## 节点树速查（最终应是这样）

```
Canvas (AppInit, Camera)
├── Bg (Sprite #0F0F1E)
├── BallCounter (Label + BallCounter.ts)
├── CatchPanel (CatchPanel.ts)
│   ├── CatchBtn (Button → onCatchBtn)
│   ├── CatchAnimNode (CatchAnim.ts) → ball(Label ⚪)
│   ├── FlipNode (CardFlipAnim.ts) → cardBack, cardFront
│   ├── ResultNode (CardView.ts) → art, name, rarity
│   ├── BurstNode (RarityBurst.ts) → ssrBurst(粒子), urBurst(粒子)
│   └── PendingHintNode (Label "卡面生成中…")
├── DexPanel (DexPanel.ts, inactive) → grid
├── ProfilePanel (ProfilePanel.ts, inactive) → ballsLabel, totalLabel, memberLabel
└── TabBar (TabBar.ts)
    ├── btnCatch (Button → switchTo 'catch')
    ├── btnDex (Button → switchTo 'dex')
    └── btnProfile (Button → switchTo 'profile')

prefabs: Card.prefab (CardView), CardDetailModal.prefab (CardDetailModal)
```
