// cloudfunctions/getProfile/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  return { ok: true, user: u.data[0] };
};
