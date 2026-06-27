// assets/scripts/panels/CatchPanel.ts
// 捕捉面板：核心仪式感流程。
// 拍照 → 球旋转 → catchPet 返回骨架卡 → 翻卡(原图占位)光效[高潮1]
//       → 轮询 artStatus done → 卡面升级(AI重绘)光效[高潮2]
import { _decorator, Node, Component } from 'cc';
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
  @property(Node)
  catchAnimNode: Node | null = null;     // 捕捉中动画（旋转球）

  @property(Node)
  resultNode: Node | null = null;        // 卡牌展示（挂 CardView）

  @property(Node)
  flipNode: Node | null = null;          // 翻卡动画（挂 CardFlipAnim）

  @property(Node)
  burstNode: Node | null = null;         // 稀有度光效（挂 RarityBurst）

  @property(Node)
  ballCounterNode: Node | null = null;   // 道具计数（挂 BallCounter）

  @property(Node)
  pendingHintNode: Node | null = null;   // "卡面生成中..."提示

  private catching = false;

  async onShow() {
    // 进面板先恢复道具
    await CloudService.recoverBalls();
    const p = await CloudService.getProfile();
    if (p.ok && p.data?.user) {
      GameState.setUser(p.data.user);
      this.ballCounterNode?.getComponent(BallCounter)?.setBalls(GameState.balls);
    }
  }

  /** 点"开始捕捉"按钮 */
  async onCatchBtn() {
    if (this.catching) return;
    if (GameState.balls <= 0) {
      WxService.showToast('捕捉球用完了，稍后再来');
      return;
    }
    this.catching = true;
    try {
      const tempPath = await WxService.chooseImage();
      this.catchAnimNode?.getComponent(CatchAnim)?.play();
      const fileID = await WxService.upload(tempPath);
      const location = await WxService.getLocation();
      const r = await CloudService.catchPet(fileID, location);
      this.catchAnimNode?.getComponent(CatchAnim)?.stop();

      if (!r.ok || !r.data) {
        WxService.showToast('捕捉失败');
        return;
      }
      const d = r.data;

      // 友好失败：非宠物，不扣球
      if (d.result === 'reject') {
        WxService.showToast('没找到猫猫气息～换一张试试');
        return;
      }

      // 高潮1：翻卡（先看到原图占位）+ 稀有度光效
      const card = d.card!;
      this.showCardFlip(card);
      // 本地立即更新道具显示（云函数已扣）
      if (GameState.user) {
        GameState.setUser({ ...GameState.user, balls: GameState.user.balls - 1 });
      }
      this.ballCounterNode?.getComponent(BallCounter)?.setBalls(GameState.balls);

      // 异步轮询卡面升级 → 高潮2
      this.pollArtUpgrade(card._id);
    } catch (e) {
      this.catchAnimNode?.getComponent(CatchAnim)?.stop();
      WxService.showToast('出错了');
    } finally {
      this.catching = false;
    }
  }

  /** 翻卡：绑定数据 → 翻转动画 → 中点触发稀有度光效 */
  private showCardFlip(card: Card) {
    this.resultNode?.getComponent(CardView)?.bind(card);
    this.flipNode?.getComponent(CardFlipAnim)?.flip(() => {
      this.burstNode?.getComponent(RarityBurst)?.play(card.rarity);
    });
  }

  /** 轮询 artStatus：done 时卡面升级 + 二次光效；failed 时提示可重生成 */
  private async pollArtUpgrade(cardId: string) {
    if (this.pendingHintNode) this.pendingHintNode.active = true;
    for (let i = 0; i < 30; i++) {  // 最多轮询约 60s
      await new Promise((r) => setTimeout(r, 2000));
      const r = await CloudService.getCardDetail(cardId);
      const card = r.data?.card;
      if (!card) continue;
      if (card.artStatus === 'done') {
        if (this.pendingHintNode) this.pendingHintNode.active = false;
        this.resultNode?.getComponent(CardView)?.upgradeArt(card.artPhoto);
        this.burstNode?.getComponent(RarityBurst)?.play(card.rarity);
        return;
      }
      if (card.artStatus === 'failed') {
        if (this.pendingHintNode) this.pendingHintNode.active = false;
        WxService.showToast('卡面生成失败，可在详情重生成');
        return;
      }
    }
    if (this.pendingHintNode) this.pendingHintNode.active = false;
  }
}
