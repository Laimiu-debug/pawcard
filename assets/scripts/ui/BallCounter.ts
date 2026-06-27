// assets/scripts/ui/BallCounter.ts
// 道具计数器：显示当前球数，扣球时有弹跳反馈。
import { _decorator, Label, Component, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BallCounter')
export class BallCounter extends Component {
  @property(Label)
  label: Label | null = null;

  private _balls = 0;

  setBalls(n: number) {
    const prev = this._balls;
    this._balls = n;
    if (this.label) this.label.string = `捕捉球 × ${n}`;
    if (n < prev) {
      // 扣球弹跳反馈
      tween(this.node)
        .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .start();
    }
  }
}
