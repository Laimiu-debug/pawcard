// assets/scripts/ui/CatchAnim.ts
// 捕捉中动画：捕捉球持续旋转，营造"识别猫猫气息"的期待感。
import { _decorator, Node, tween, Vec3, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CatchAnim')
export class CatchAnim extends Component {
  @property(Node)
  ball: Node | null = null;

  private _tween: any = null;

  play() {
    this.node.active = true;
    if (!this.ball) return;
    // 持续旋转（1 秒一圈）
    this._tween = tween(this.ball)
      .by(1, { eulerAngles: new Vec3(0, 0, 360) })
      .repeatForever()
      .start();
  }

  stop() {
    if (this._tween) {
      // cc tween 通过 TweenSystem 停止；简化用节点失活
      this._tween = null;
    }
    this.node.active = false;
  }
}
