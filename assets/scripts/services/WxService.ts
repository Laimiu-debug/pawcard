// assets/scripts/services/WxService.ts
// 封装微信小游戏 API：拍照/选图、上传云存储、定位、Toast。
import { CatchLocation } from '../core/Types';

export const WxService = {
  /** 拍照/选图，返回临时路径 */
  chooseImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1,
        sourceType: ['camera', 'album'],
        success: (res) => resolve(res.tempFilePaths[0]),
        fail: reject,
      });
    });
  },

  /** 上传到云存储，返回 fileID */
  upload(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `catch/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`,
        filePath,
        success: (res) => resolve(res.fileID),
        fail: reject,
      });
    });
  },

  /** 获取定位，拒绝/失败返回 null（不阻断捕捉流程） */
  getLocation(): Promise<CatchLocation | null> {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => resolve({ lat: res.latitude, lng: res.longitude, publicArea: '我的位置' }),
        fail: () => resolve(null),
      });
    });
  },

  showToast(title: string, icon: 'none' | 'success' = 'none') {
    wx.showToast({ title, icon });
  },
};
