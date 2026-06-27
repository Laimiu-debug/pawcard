// assets/scripts/ui/RarityBadge.ts
import { _decorator, Label, Sprite, Component } from 'cc';
import { Rarity } from '../core/Types';
import { RARITY_STYLE } from '../utils/colors';

const { ccclass, property } = _decorator;

@ccclass('RarityBadge')
export class RarityBadge extends Component {
  @property(Label)
  label: Label | null = null;

  @property(Sprite)
  bg: Sprite | null = null;

  setRarity(rarity: Rarity) {
    const s = RARITY_STYLE[rarity];
    if (this.label) this.label.string = s.name;
    if (this.bg) this.bg.color = s.bg;
  }
}
