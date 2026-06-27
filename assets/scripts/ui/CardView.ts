// assets/scripts/ui/CardView.ts
// 卡牌视图：卡面图 + 卡名 + 稀有度。支持绑定和"卡面升级"（原图→AI重绘）。
import { _decorator, Sprite, SpriteFrame, Label, Component, tween, UIOpacity } from 'cc';
import { Card } from '../core/Types';

const { ccclass, property } = _decorator;

@ccclass('CardView')
export class CardView extends Component {
  @property(Sprite)
  art: Sprite | null = null;       // 卡面

  @property(Label)
  name: Label | null = null;

  @property(Label)
  rarity: Label | null = null;

  private _card: Card | null = null;
  get card() { return this._card; }

  bind(card: Card) {
    this._card = card;
    if (this.name) this.name.string = card.name || `#${card.cardNo}`;
    if (this.rarity) this.rarity.string = card.rarity;
    this.loadArt(card.artPhoto);
  }

  /** 卡面升级（原图→AI重绘图）：淡出→换图→淡入。 */
  upgradeArt(newFileID: string) {
    const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
    tween(op)
      .to(0.3, { opacity: 0 })
      .call(() => {
        this.loadArt(newFileID, () => {
          tween(op).to(0.3, { opacity: 255 }).start();
        });
      })
      .start();
  }

  private loadArt(fileID: string, cb?: () => void) {
    if (!this.art) { cb?.(); return; }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        const img = new Image();
        img.onload = () => {
          const tex = new cc.Texture2D();
          const w = img.width, h = img.height;
          tex.reset({ width: w, height: h, format: cc.Texture2D.PixelFormat.RGB888 });
          tex.uploadData(img);
          tex.upload();
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
