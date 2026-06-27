// cloudfunctions/getCardDetail/index.js
// 卡片详情：前端轮询 artStatus 用。
// 两个职责：1) 地点隐私隔离（本人见精确坐标，他人仅 publicArea）
//          2) 懒触发重绘：artStatus==='pending' 且距创建超 3s → 触发 genCardArtTask
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  const r = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  if (!r.data) return { ok: false, error: 'not-found' };
  const card = r.data;

  // 懒触发重绘：pending 且距创建超过 3s（避开与 catchPet 写入的竞态）
  if (card.artStatus === 'pending' && Date.now() - card.createdAt > 3000) {
    try {
      await cloud.callFunction({ name: 'genCardArtTask', data: { cardId } });
      // mock 重绘是同步的，重读一次拿 done；真实 API 可能仍 pending，前端继续轮询
      const r2 = await db.collection('cards').doc(cardId).get().catch(() => ({ data: card }));
      const fresh = r2.data || card;
      return { ok: true, card: maskLocation(fresh, fresh.ownerOpenid === openid) };
    } catch (e) {
      // 触发失败也返回当前状态，前端继续轮询
    }
  }

  return { ok: true, card: maskLocation(card, card.ownerOpenid === openid) };
};

function maskLocation(card, isOwner) {
  if (!card.caughtLocation) return card;
  return {
    ...card,
    caughtLocation: isOwner
      ? card.caughtLocation
      : { publicArea: card.caughtLocation.publicArea },
  };
}
