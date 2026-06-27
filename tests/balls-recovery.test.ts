// tests/balls-recovery.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecovery } from '../shared/balls-recovery';

const HOUR = 3600 * 1000;

test('不足一个 interval 不补发', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 3 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 0);
  assert.equal(o.newBalls, 0);
  assert.equal(o.newRecoveredAt, 0);
});

test('满一个 interval 补 1 余数 0', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 4 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 1);
  assert.equal(o.newBalls, 1);
  assert.equal(o.newRecoveredAt, 4 * HOUR);
});

test('余数时间保留不被吞', () => {
  const o = computeRecovery({ currentBalls: 0, max: 3, recoveredAt: 0, now: 9 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.recovered, 2);
  assert.equal(o.newBalls, 2);
  assert.equal(o.newRecoveredAt, 8 * HOUR);
});

test('不超过上限', () => {
  const o = computeRecovery({ currentBalls: 2, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.newBalls, 3);
  assert.equal(o.recovered, 1);
});

test('已满上限不补不前进', () => {
  const o = computeRecovery({ currentBalls: 3, max: 3, recoveredAt: 0, now: 20 * HOUR, intervalMs: 4 * HOUR });
  assert.equal(o.newBalls, 3);
  assert.equal(o.recovered, 0);
  assert.equal(o.newRecoveredAt, 0);
});
