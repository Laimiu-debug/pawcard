// assets/scripts/core/EventManager.ts
// 简易事件总线：组件间解耦通信（如卡面就绪通知）。
type Handler = (data?: any) => void;

class Emitter {
  private map = new Map<string, Handler[]>();

  on(evt: string, h: Handler) {
    let arr = this.map.get(evt);
    if (!arr) { arr = []; this.map.set(evt, arr); }
    arr.push(h);
  }

  off(evt: string, h: Handler) {
    const arr = this.map.get(evt);
    if (!arr) return;
    const i = arr.indexOf(h);
    if (i >= 0) arr.splice(i, 1);
  }

  emit(evt: string, data?: any) {
    this.map.get(evt)?.forEach((h) => h(data));
  }
}

export const EventManager = new Emitter();

export const EVT = {
  ART_READY: 'art-ready',
  BALLS_CHANGED: 'balls-changed',
} as const;
