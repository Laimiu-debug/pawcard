// assets/scripts/ui/TabBar.ts
// 底部 Tab 切换：在三个 Panel 间切换，激活时调用 Panel.onShow()。
import { _decorator, Node, Component } from 'cc';

const { ccclass, property } = _decorator;

type PanelName = 'catch' | 'dex' | 'profile';

@ccclass('TabBar')
export class TabBar extends Component {
  @property(Node)
  catchPanel: Node | null = null;

  @property(Node)
  dexPanel: Node | null = null;

  @property(Node)
  profilePanel: Node | null = null;

  private current: Node | null = null;

  onLoad() {
    this.switchTo('catch');
  }

  switchTo(name: PanelName) {
    const panels: Record<PanelName, Node | null> = {
      catch: this.catchPanel,
      dex: this.dexPanel,
      profile: this.profilePanel,
    };
    Object.values(panels).forEach((p) => { if (p) p.active = false; });
    const target = panels[name];
    if (!target) return;
    target.active = true;
    this.current = target;
    const compMap: Record<PanelName, string> = {
      catch: 'CatchPanel',
      dex: 'DexPanel',
      profile: 'ProfilePanel',
    };
    const comp = target.getComponent(compMap[name]) as any;
    comp?.onShow?.();
  }
}
