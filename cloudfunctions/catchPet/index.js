// cloudfunctions/catchPet/index.js
// 核心捕捉：识别 → 算稀有度 → 写骨架卡(artStatus:pending) → 扣道具 → 触发后台重绘。
// 异步链路：catchPet 秒回骨架卡，重绘由 getCardDetail 懒触发（见 getCardDetail 云函数）。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { computeRarity, DEFAULT_RARITY_CONFIG } = require('./rarity-engine');
const { recognize } = require('./recognize');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

function locationScore(loc) {
  return (loc && loc.lat) ? 60 : 0;
}

function timeScore(ts) {
  const h = new Date(ts).getHours();
  return (h >= 20 || h < 6) ? 70 : 30;
}

/** 兜底生成卡名+文案。真实接入应调多模态大模型按毛色/稀有度生成。MVP 用风格化模板。 */
function genCardMeta(rec) {
  const namePrefix = { '橘猫': '橘', '三花': '花', '奶牛': '墨', '黑猫': '夜', '白猫': '雪' };
  const nameScene = ['巷影', '街角', '檐下', '灯前', '雨后', '窗台'];
  const descPool = ['警觉地望着远方', '慵懒地打着哈欠', '神秘地隐入夜色', '亲昵地蹭过裤脚', '安静地梳理毛发'];
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const p = namePrefix[rec.furColor] || '喵';
  return {
    name: `${p}${rand(nameScene)}`,
    desc: rand(descPool),
  };
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { fileID, location } = event;
  if (!fileID) return { ok: false, error: 'no-file' };

  // 1. 校验用户与道具
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  const user = u.data[0];
  if (user.balls <= 0) return { ok: false, error: 'no-balls' };

  // 2. AI 识别
  const rec = await recognize(fileID);

  // 3. 友好失败：非宠物/低质量 → 不扣球
  if (!rec.isPet) {
    await db.collection('catches_log').add({ data: {
      openid, fileID, location: location || null, aiCostEstimate: 0.02,
      result: 'reject', consumedBall: false, createdAt: Date.now(),
    }});
    return { ok: true, data: { result: 'reject', reason: 'no-pet' } };
  }

  // 4. 稀有度
  const rarityConfig = {
    weights: await getConfig('rarity_weights', DEFAULT_RARITY_CONFIG.weights),
    thresholds: await getConfig('rarity_thresholds', DEFAULT_RARITY_CONFIG.thresholds),
  };
  const rarity = computeRarity({
    featureScore: rec.featureScore,
    qualityScore: rec.qualityScore,
    locationScore: locationScore(location),
    timeScore: timeScore(Date.now()),
    aiScore: rec.aiScore,
  }, rarityConfig);

  const now = Date.now();
  const { name, desc } = genCardMeta(rec);
  const cardBase = {
    ownerOpenid: openid, name, rarity, level: 1,
    petType: rec.petType, furColor: rec.furColor, traits: [],
    originPhoto: fileID, artPhoto: fileID, artStatus: 'pending',
    desc, caughtAt: now, caughtLocation: location || null, isPublic: true, createdAt: now,
  };

  // 5. 事务：编号自增 + 写卡 + 扣道具 + 写日志
  try {
    const ret = await db.runTransaction(async tx => {
      // 全局卡片编号自增
      let cardNo = 1;
      const ctr = await tx.collection('counters').where({ _id: 'cardNo' }).get();
      if (ctr.data && ctr.data.length > 0) {
        await tx.collection('counters').doc('cardNo').update({ data: { seq: _.inc(1) } });
        cardNo = ctr.data[0].seq + 1;
      } else {
        await tx.collection('counters').add({ data: { _id: 'cardNo', seq: 1 } });
      }
      const cardRes = await tx.collection('cards').add({ data: { ...cardBase, cardNo } });
      await tx.collection('users').doc(user._id).update({
        data: { balls: _.inc(-1), totalCaught: _.inc(1), updatedAt: now },
      });
      await tx.collection('catches_log').add({ data: {
        openid, fileID, location: location || null, aiCostEstimate: 0.22,
        result: 'card', rarity, consumedBall: true, createdAt: now,
      }});
      return { _id: cardRes._id, cardNo };
    });

    // 6. 异步触发重绘：云函数无法 fire-and-forget 调另一个，
    //    MVP 由 getCardDetail 懒触发（见 getCardDetail）。这里仅返回骨架卡。
    return { ok: true, data: { result: 'card', card: { _id: ret._id, cardNo: ret.cardNo, ...cardBase } } };
  } catch (e) {
    return { ok: false, error: 'txn-failed', detail: String(e) };
  }
};
