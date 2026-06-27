// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { ok: false, error: 'no-openid' };

  const now = Date.now();
  // 查是否已存在
  const existing = await db.collection('users').where({ openid }).limit(1).get();
  if (existing.data.length > 0) {
    return { ok: true, user: existing.data[0] };
  }

  // 首次：初始化 users 文档
  const cfg = await db.collection('config').where({ key: 'free_balls_max' }).limit(1).get();
  const freeMax = cfg.data[0]?.value ?? 3;
  const newUser = {
    openid,
    nickname: '',
    avatar: '',
    balls: freeMax,
    ballsMax: freeMax,
    ballsRecoveredAt: now,
    membership: null,
    totalCaught: 0,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection('users').add({ data: newUser });
  return { ok: true, user: { _id: res._id, ...newUser } };
};
