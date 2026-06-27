// assets/scripts/ui/RarityBurst.ts
// 稀有度光效：高稀有度触发粒子爆裂。SSR 金粒子，UR 全屏彩虹爆裂。
// 粒子节点在 Cocos 编辑器里配置（ParticleSystem 组件），本脚本负责按稀有度触发。
import { _decorator, ParticleSystem, Node, Component } from 'cc';
import { Rarity } from '../core/Types';

const { ccclass, property } = _decorator;

@ccclass('RarityBurst')
export class RarityBurst extends Component {
  // 在编辑器里为每个稀有度挂一个粒子节点
  @property(Node)
  ssrBurst: Node | null = null;   // 金粒子

  @property(Node)
  urBurst: Node | null = null;    // 全屏彩虹爆裂

  play(rarity: Rarity) {
    if (rarity === 'SSR' && this.ssrBurst) {
      this.ssrBurst.active = true;
      this.ssrBurst.getComponent(ParticleSystem)?.play();
    }
    if (rarity === 'UR' && this.urBurst) {
      this.urBurst.active = true;
      this.urBurst.getComponent(ParticleSystem)?.play();
    }
    // N/R/SR 用简单缩放反馈，后续可在编辑器加更多粒子
  }
}
