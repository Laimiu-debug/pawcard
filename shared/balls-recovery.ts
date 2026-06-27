// shared/balls-recovery.ts
import type { RecoveryInput, RecoveryOutput } from './types';

/**
 * 道具懒恢复算法：根据距上次恢复的时长，计算该补发几个球。
 * 关键：ballsRecoveredAt 只前进"实际补了的数量×interval"，余数时间保留，
 * 避免直接设成 now 而吞掉"恢复到一半"的零头。
 */
export function computeRecovery(input: RecoveryInput): RecoveryOutput {
  const { currentBalls, max, recoveredAt, now, intervalMs } = input;

  if (now <= recoveredAt || intervalMs <= 0) {
    return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  }

  // 已满上限：不补，时间基准不前进（约定，避免满上限后无限积压）
  if (currentBalls >= max) {
    return { newBalls: max, newRecoveredAt: recoveredAt, recovered: 0 };
  }

  const recoverable = Math.floor((now - recoveredAt) / intervalMs);
  if (recoverable <= 0) {
    return { newBalls: currentBalls, newRecoveredAt: recoveredAt, recovered: 0 };
  }

  const newBalls = Math.min(currentBalls + recoverable, max);
  const recovered = newBalls - currentBalls;
  // 只前进"实际补了"对应的时长，余数保留
  const newRecoveredAt = recoveredAt + recovered * intervalMs;
  return { newBalls, newRecoveredAt, recovered };
}
