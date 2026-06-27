// assets/scripts/services/CloudService.ts
// 封装所有 wx.cloud.callFunction 调用，统一错误处理。
import { Card, UserDoc, CatchLocation } from '../core/Types';

interface Resp<T> { ok: boolean; data?: T; error?: string; [k: string]: any; }

function call<T = any>(name: string, data?: any): Promise<Resp<T>> {
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => resolve(res.result as Resp<T>),
      fail: (err: any) => resolve({ ok: false, error: err.errMsg || 'cloud-failed' }),
    });
  });
}

export const CloudService = {
  login: () => call<{ user: UserDoc }>('login'),
  getProfile: () => call<{ user: UserDoc }>('getProfile'),
  recoverBalls: () => call<{ balls: number; recovered: number }>('recoverBalls'),
  catchPet: (fileID: string, location: CatchLocation | null) =>
    call<{ result: 'card' | 'reject'; card?: Card; reason?: string }>('catchPet', { fileID, location }),
  genCardArt: (cardId: string) => call<{ artPhoto: string }>('genCardArt', { cardId }),
  getDex: (page = 1, sortBy: 'time' | 'rarity' = 'time') =>
    call<{ cards: Card[]; total: number }>('getDex', { page, sortBy }),
  getCardDetail: (cardId: string) => call<{ card: Card }>('getCardDetail', { cardId }),
};
