// assets/scripts/scenes/CardDetailModal.ts
// 卡片详情弹窗：大图 + 完整属性 + 稀有度徽章 + 重生成卡面。
import { _decorator, Node, Component } from 'cc';
import { CloudService } from '../services/CloudService';
import { WxService } from '../services/WxService';
import { CardView } from '../ui/CardView';
import { RarityBadge } from '../ui/RarityBadge';
import { GameState } from '../core/GameState';

const { ccclass, property } = _decorator;

@ccclass('CardDetailModal')
export class CardDetailModal extends Component {
  @property(Node)
  cardViewNode: Node | null = null;   // 挂 CardView

  @property(Node)
  badgeNode: Node | null = null;      // 挂 RarityBadge

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

  /** 用户主动重生成卡面（消耗 1 球） */
  async onRegenBtn() {
    if (GameState.balls <= 0) {
      WxService.showToast('捕捉球不足');
      return;
    }
    const r = await CloudService.genCardArt(this.cardId);
    if (r.ok && r.data?.artPhoto) {
      this.cardViewNode?.getComponent(CardView)?.upgradeArt(r.data.artPhoto);
      // 同步本地道具
      const p = await CloudService.getProfile();
      if (p.ok && p.data?.user) GameState.setUser(p.data.user);
    } else {
      WxService.showToast('重生成失败');
    }
  }

  onShareBtn() {
    WxService.showToast('分享开发中');
  }

  onCloseBtn() {
    this.node.active = false;
  }
}
