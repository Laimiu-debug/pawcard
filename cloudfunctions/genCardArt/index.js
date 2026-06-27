// cloudfunctions/genCardArt/index.js
// 用户主动重生成卡面：消耗 1 球，调 art-provider 重绘。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const { generateCardArt } = require('./art-provider');

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  if (!cardId) return { ok: false, error: 'no-card' };

  // 校验道具
  const u = await db.collection('users').where({ openid }).limit(1).get();
  if (u.data.length === 0) return { ok: false, error: 'no-user' };
  if (u.data[0].balls <= 0) return { ok: false, error: 'no-balls' };

  // 校验卡片归属
  const c = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  const card = c.data;
  if (!card || card.ownerOpenid !== openid) return { ok: false, error: 'forbidden' };

  const recognizeStub = {
    isPet: true, petType: card.petType, furColor: card.furColor,
    featureScore: 50, qualityScore: 50, aiScore: 50,
  };

  try {
    const out = await generateCardArt({
      originFileID: card.originPhoto,
      rarity: card.rarity,
      recognize: recognizeStub,
      cloud,   // 注入云能力
    });
    // 事务：更新卡面 + 扣道具
    await db.runTransaction(async tx => {
      await tx.collection('cards').doc(cardId).update({
        data: { artPhoto: out.artFileID, artStatus: 'done' },
      });
      await tx.collection('users').doc(u.data[0]._id).update({
        data: { balls: _.inc(-1), updatedAt: Date.now() },
      });
    });
    return { ok: true, artPhoto: out.artFileID };
  } catch (e) {
    return { ok: false, error: 'artgen-failed', detail: String(e) };
  }
};
