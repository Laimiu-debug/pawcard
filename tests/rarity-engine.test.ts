// tests/rarity-engine.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRarity } from '../shared/rarity-engine';
import type { RarityConfig } from '../shared/types';

const config: RarityConfig = {
  weights: { feature: 30, quality: 25, location: 15, time: 10, ai: 20 },
  thresholds: { N: 0, R: 35, SR: 55, SSR: 75, UR: 90 },
};

const all = (s: number) => ({ featureScore: s, qualityScore: s, locationScore: s, timeScore: s, aiScore: s });

test('全 0 → N', () => assert.equal(computeRarity(all(0), config), 'N'));
test('全 100 → UR', () => assert.equal(computeRarity(all(100), config), 'UR'));
test('全 50 → R', () => assert.equal(computeRarity(all(50), config), 'R'));
test('全 80 → SSR', () => assert.equal(computeRarity(all(80), config), 'SSR'));
test('阈值下界 全 35 → R', () => assert.equal(computeRarity(all(35), config), 'R'));
test('全 65 → SR', () => assert.equal(computeRarity(all(65), config), 'SR'));
