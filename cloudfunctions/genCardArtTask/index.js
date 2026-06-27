// cloudfunctions/genCardArtTask/index.js
// 后台重绘：被 getCardDetail 懒触发。从 card 读 originPhoto/rarity，调 art-provider 重绘，
// 质量分过低自动重试一次，写回 artPhoto + artStatus。
// 卡名/文案已在 catchPet 的 genCardMeta 生成，这里只负责重绘图。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const { generateCardArt } = require('./art-provider');

async function getConfig(key, fallback) {
  const r = await db.collection('config').where({ key }).limit(1).get();
  return r.data[0]?.value ?? fallback;
}

exports.main = async (event) => {
  const { cardId } = event;
  if (!cardId) return { ok: false, error: 'no-card' };

  const c = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  const card = c.data;
  if (!card) return { ok: false, error: 'not-found' };
  if (card.artStatus === 'done') return { ok: true, skipped: 'already-done' };

  const retryThreshold = await getConfig('artgen_retry_threshold', 0.5);
  const recognizeStub = {
    isPet: true, petType: card.petType, furColor: card.furColor,
    featureScore: 50, qualityScore: 50, aiScore: 50,
  };

  try {
    let out = await generateCardArt({
      originFileID: card.originPhoto,
      rarity: card.rarity,
      recognize: recognizeStub,
    });

    // 质量兜底：分数过低重试一次，取较高者
    if (out.qualityScore < retryThreshold) {
      const out2 = await generateCardArt({
        originFileID: card.originPhoto,
        rarity: card.rarity,
        recognize: recognizeStub,
      });
      if (out2.qualityScore > out.qualityScore) out = out2;
    }

    await db.collection('cards').doc(cardId).update({
      data: { artPhoto: out.artFileID, artStatus: 'done' },
    });
    return { ok: true, artPhoto: out.artFileID };
  } catch (e) {
    await db.collection('cards').doc(cardId).update({ data: { artStatus: 'failed' } });
    return { ok: false, error: 'artgen-failed', detail: String(e) };
  }
};
