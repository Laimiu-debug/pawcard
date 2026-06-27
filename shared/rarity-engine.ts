// shared/rarity-engine.ts
import type { RarityInput, RarityConfig, Rarity } from './types';

/**
 * 稀有度规则引擎：5 维加权打分后映射到稀有度等级。
 * 阈值为下界：score >= 该档阈值即落该档，从高到低判定。
 */
export function computeRarity(input: RarityInput, config: RarityConfig): Rarity {
  const w = config.weights;
  const score = (
    input.featureScore * w.feature +
    input.qualityScore * w.quality +
    input.locationScore * w.location +
    input.timeScore * w.time +
    input.aiScore * w.ai
  ) / 100;

  const t = config.thresholds;
  if (score >= t.UR) return 'UR';
  if (score >= t.SSR) return 'SSR';
  if (score >= t.SR) return 'SR';
  if (score >= t.R) return 'R';
  return 'N';
}

/** 默认稀有度配置，云函数读 config 集合失败时兜底。 */
export const DEFAULT_RARITY_CONFIG: RarityConfig = {
  weights: { feature: 30, quality: 25, location: 15, time: 10, ai: 20 },
  thresholds: { N: 0, R: 35, SR: 55, SSR: 75, UR: 90 },
};
