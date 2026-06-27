// assets/scripts/ui/CardFlipAnim.ts
// 卡牌翻转动画：先转 90°（藏卡背），换面，再转回 0°（亮卡面）。仪式感第一次高潮。
import { _decorator, Node, tween, Vec3, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CardFlipAnim')
export class CardFlipAnim extends Component {
  @property(Node)
  cardBack: Node | null = null;   // 卡背

  @property(Node)
  cardFront: Node | null = null;  // 卡面

  /** 翻卡：转 90° 藏卡背 → 换面亮卡面（onMid 回调，可在此触发光效）→ 转回 0°。 */
  flip(onMid?: () => void) {
    if (!this.cardFront || !this.cardBack) return;
    this.cardFront.active = false;
    this.cardBack.active = true;
    tween(this.node)
      .to(0.25, { eulerAngles: new Vec3(0, 90, 0) })
      .call(() => {
        this.cardBack!.active = false;
        this.cardFront!.active = true;
        onMid?.();
      })
      .to(0.25, { eulerAngles: new Vec3(0, 0, 0) })
      .start();
  }
}
