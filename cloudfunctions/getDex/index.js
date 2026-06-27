// cloudfunctions/getDex/index.js
// 分页拉取本人图鉴，支持按时间/稀有度排序。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const RARITY_ORDER = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { page = 1, pageSize = 20, sortBy = 'time' } = event;
  const skip = (page - 1) * pageSize;

  const total = (await db.collection('cards').where({ ownerOpenid: openid }).count()).total;
  let cards = [];

  if (sortBy === 'rarity') {
    // 云数据库不支持自定义排序，取回后内存排
    const all = await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').limit(100).get();
    cards = all.data
      .sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0))
      .slice(skip, skip + pageSize);
  } else {
    cards = (await db.collection('cards').where({ ownerOpenid: openid })
      .orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get()).data;
  }

  return { ok: true, cards, total, page, pageSize };
};
