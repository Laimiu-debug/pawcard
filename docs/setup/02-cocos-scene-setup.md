# Cocos Creator 场景搭建指引（Task 17）

> 本步骤需在 **Cocos Creator 3.8.x 编辑器** GUI 中完成（无法命令行产出 .scene/.prefab/粒子）。
> 所有脚本已就绪，这里把脚本挂到节点上、连引用、配粒子。

## 前置：打开项目

1. Cocos Dashboard → 打开本地项目 → 选 `E:\cutcat`
2. 若提示缺项目文件：用 Dashboard 新建一个 Empty(2D) 项目到临时目录，把生成的 `settings/`、`assets/`（保留我们已写的 scripts）合并后打开

---

## 1. 创建 MainScene

`assets/scenes/` 右键 → 新建 → Scene → 命名 `MainScene`，双击打开。

## 2. 搭建节点树

在 MainScene 的层级面板，按下表创建节点并挂组件、连引用：

| 节点路径 | 组件 | 引用连接 |
|---|---|---|
| `Canvas/Bg` | Sprite（深色 #0f0f1e） | — |
| `Canvas/BallCounter` | Label + **BallCounter.ts** | BallCounter.label → 自己的 Label |
| `Canvas/CatchPanel` | **CatchPanel.ts** | 见下方 CatchPanel 引用 |
| `Canvas/CatchPanel/CatchBtn` | Button | ClickEvents → CatchPanel.onCatchBtn |
| `Canvas/CatchPanel/CatchAnimNode` | **CatchAnim.ts** + 子节点 `ball` | CatchAnim.ball → ball 子节点 |
| `Canvas/CatchPanel/FlipNode` | **CardFlipAnim.ts** + 子节点 `cardBack`、`cardFront` | CardFlipAnim.cardBack/cardFront |
| `Canvas/CatchPanel/ResultNode` | **CardView.ts** + 子节点 `art`(Sprite)、`name`(Label)、`rarity`(Label) | CardView.art/name/rarity |
| `Canvas/CatchPanel/BurstNode` | **RarityBurst.ts** + 子节点 `ssrBurst`、`urBurst` | RarityBurst.ssrBurst/urBurst |
| `Canvas/CatchPanel/PendingHintNode` | Label "卡面生成中…" | 默认 active=false |
| `Canvas/DexPanel` | **DexPanel.ts** + 子节点 `grid` | 见下方；默认 active=false |
| `Canvas/ProfilePanel` | **ProfilePanel.ts** + 子节点 ballsLabel/totalLabel/memberLabel | 默认 active=false |
| `Canvas/TabBar` | **TabBar.ts** | TabBar.catchPanel/dexPanel/profilePanel → 三个 Panel 节点 |

**CatchPanel 引用**（CatchPanel.ts 的 @property）：
- `catchAnimNode` → CatchAnimNode
- `resultNode` → ResultNode
- `flipNode` → FlipNode
- `burstNode` → BurstNode
- `ballCounterNode` → 顶层 BallCounter 节点
- `pendingHintNode` → PendingHintNode

**TabBar**：建 3 个 Button（捕捉/图鉴/我的），每个的 ClickEvents → TabBar.switchTo，参数填 `'catch'`/`'dex'`/`'profile'`。

## 3. 配置粒子特效（SSR/UR）

`BurstNode` 下：
- `ssrBurst`：加 **ParticleSystem** 组件
  - startColor: `#FFD700`（金）
  - 喷射模式（playOnLoad 关掉），默认 active=false
- `urBurst`：加 **ParticleSystem** 组件
  - 多色彩虹（用颜色渐变或多个粒子）
  - 全屏范围爆裂，默认 active=false

## 4. 创建卡牌预制体 Card.prefab

`assets/prefabs/` 右键 → 新建 → Prefab → 命名 `Card`。双击编辑：
- 根节点挂 **CardView.ts**
- 子节点：`art`(Sprite)、`name`(Label)、`rarity`(Label)、`RarityBadge`(挂 RarityBadge.ts)
- 连 CardView.art/name/rarity

在 DexPanel 的 `cardPrefab` 引用里拖入这个预制体。

## 5. 创建详情弹窗预制体 CardDetailModal.prefab

`assets/prefabs/` 新建 Prefab → 命名 `CardDetailModal`：
- 根节点挂 **CardDetailModal.ts**
- 子节点：背景遮罩 + `cardViewNode`(挂 CardView) + `badgeNode`(挂 RarityBadge) + 三个 Button（重生卡面/分享/关闭）
- ClickEvents：重生 → onRegenBtn，分享 → onShareBtn，关闭 → onCloseBtn
- 默认 active=false

在 DexPanel 的 `detailPrefab` 引用里拖入。

## 6. 预览验证

编辑器点运行 ▶。预期：
- 看到 3 个 Tab + 捕捉面板 + 道具计数
- 点捕捉按钮（编辑器内 wx.chooseImage 可能受限，完整拍照链路需构建到微信工具验证）

## 7. 构建 + 真机验证

1. 编辑器 → 项目 → 构建发布 → 平台「微信小游戏」→ AppID `wx5f2be181d74900e1` → 构建
2. 产物在 `build/wechatgame/`
3. 微信开发者工具打开 `build/wechatgame/`，配置云环境 `cloudbase-d0gm6j7hqbc346db6`
4. 真机扫码预览
