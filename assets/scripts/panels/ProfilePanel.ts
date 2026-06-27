// assets/scripts/panels/ProfilePanel.ts
// 我的面板：道具余额、收集数、会员状态。
import { _decorator, Label, Component } from 'cc';
import { CloudService } from '../services/CloudService';
import { GameState } from '../core/GameState';

const { ccclass, property } = _decorator;

@ccclass('ProfilePanel')
export class ProfilePanel extends Component {
  @property(Label)
  ballsLabel: Label | null = null;

  @property(Label)
  totalLabel: Label | null = null;

  @property(Label)
  memberLabel: Label | null = null;

  async onShow() {
    const r = await CloudService.getProfile();
    if (!r.ok || !r.data?.user) return;
    const u = r.data.user;
    GameState.setUser(u);
    if (this.ballsLabel) this.ballsLabel.string = `${u.balls} / ${u.ballsMax}`;
    if (this.totalLabel) this.totalLabel.string = `${u.totalCaught}`;
    if (this.memberLabel) this.memberLabel.string = u.membership ? 'VIP' : '未开通';
  }
}
