// assets/scripts/core/AppInit.ts
// 小游戏入口：启动时初始化微信云开发。挂在 MainScene 的 Canvas 上。
import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

@ccclass('AppInit')
export class AppInit extends Component {
  onLoad() {
    if (typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-d0gm6j7hqbc346db6',
        traceUser: true,
      });
      console.log('wx.cloud initialized');
    } else {
      console.warn('wx.cloud not available (非微信环境)');
    }
  }
}
