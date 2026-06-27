// cloudfunctions/recoverBalls/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { computeRecovery } = require('./balls-recovery');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];

  const isVip = user.membership && user.membership.expireAt > Date.now();
  const max = await getConfig(isVip ? 'vip_balls_max' : 'free_balls_max', isVip ? 10 : 3);
  const intervalHours = await getConfig(isVip ? 'recovery_speed_vip_hours' : 'recovery_interval_hours', isVip ? 2 : 4);

  const out = computeRecovery({
    currentBalls: user.balls,
    max,
    recoveredAt: user.ballsRecoveredAt,
    now: Date.now(),
    intervalMs: intervalHours * 3600 * 1000,
  });

  if (out.recovered > 0) {
    await db.collection('users').doc(user._id).update({
      data: { balls: out.newBalls, ballsRecoveredAt: out.newRecoveredAt, updatedAt: Date.now() },
    });
  }
  return { ok: true, balls: out.newBalls, recovered: out.recovered };
};
