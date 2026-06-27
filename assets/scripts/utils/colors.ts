// assets/scripts/utils/colors.ts
// 稀有度配色表（徽章文字色 + 徽章底色）。
import { Rarity } from '../core/Types';

export interface RarityStyle {
  name: string;
  color: cc.Color;   // 文字色
  bg: cc.Color;      // 底色
}

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  N:   { name: '普通',   color: new cc.Color(180, 180, 180), bg: new cc.Color(85, 85, 85) },
  R:   { name: '稀有',   color: new cc.Color(120, 180, 255), bg: new cc.Color(30, 111, 184) },
  SR:  { name: '超稀有', color: new cc.Color(200, 140, 255), bg: new cc.Color(107, 63, 160) },
  SSR: { name: '传说',   color: new cc.Color(255, 215, 0),   bg: new cc.Color(212, 175, 55) },
  UR:  { name: '幻兽',   color: new cc.Color(255, 120, 200), bg: new cc.Color(255, 94, 94) },
};
