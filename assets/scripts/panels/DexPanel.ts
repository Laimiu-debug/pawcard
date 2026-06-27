// assets/scripts/panels/DexPanel.ts
// 图鉴面板：网格展示本人卡片，按时间/稀有度排序，点击进详情弹窗。
import { _decorator, Node, Prefab, instantiate, Component } from 'cc';
import { CloudService } from '../services/CloudService';
import { Card } from '../core/Types';
import { CardView } from '../ui/CardView';

const { ccclass, property } = _decorator;

@ccclass('DexPanel')
export class DexPanel extends Component {
  @property(Node)
  grid: Node | null = null;

  @property(Prefab)
  cardPrefab: Prefab | null = null;

  /** 详情弹窗预制体（Task 18 接入） */
  @property(Prefab)
  detailPrefab: Prefab | null = null;

  private sortBy: 'time' | 'rarity' = 'time';

  async onShow() {
    if (!this.grid || !this.cardPrefab) return;
    this.grid.removeAllChildren();
    const r = await CloudService.getDex(1, this.sortBy);
    if (!r.ok || !r.data?.cards) return;
    for (const card of r.data.cards) {
      const node = instantiate(this.cardPrefab);
      node.getComponent(CardView)?.bind(card);
      node.on('click', () => this.openDetail(card._id));
      this.grid.addChild(node);
    }
  }

  /** 切换排序后重新加载 */
  toggleSort() {
    this.sortBy = this.sortBy === 'time' ? 'rarity' : 'time';
    this.onShow();
  }

  /** 打开详情弹窗（Task 18 实现 CardDetailModal） */
  private openDetail(id: string) {
    if (!this.detailPrefab) return;
    const node = instantiate(this.detailPrefab);
    this.node.parent!.addChild(node);
    // CardDetailModal 组件接入后取消下面注释
    // node.getComponent(CardDetailModal)?.open(id);
    const comp = node.getComponent('CardDetailModal') as any;
    comp?.open?.(id);
  }
}
