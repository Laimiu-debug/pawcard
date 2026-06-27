// assets/scripts/core/GameState.ts
// 全局状态：当前登录用户。供各 Panel 共享。
import { UserDoc } from './Types';

export const GameState = {
  user: null as UserDoc | null,

  setUser(u: UserDoc | null) {
    this.user = u;
  },

  get balls(): number {
    return this.user?.balls ?? 0;
  },
};
