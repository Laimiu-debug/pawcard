// cloudfunctions/getCardDetail/index.js
// 卡片详情：前端轮询 artStatus 用。
// 两个职责：1) 地点隐私隔离（本人见精确坐标，他人仅 publicArea）
//          2) 懒触发重绘：artStatus==='pending' 且距创建超 3s → 标记 processing 后触发 genCardArtTask
//             processing 态防重入，避免多次轮询重复触发 AI 重绘（防成本失控）。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const { cardId } = event;
  const r = await db.collection('cards').doc(cardId).get().catch(() => ({ data: null }));
  if (!r.data) return { ok: false, error: 'not-found' };
  const card = r.data;

  // 懒触发重绘：pending 且距创建超过 3s（避开与 catchPet 写入的竞态）。
  // 先原子标记 processing 防重入，再触发；标记失败说明已有请求在处理，直接返回。
  if (card.artStatus === 'pending' && Date.now() - card.createdAt > 3000) {
    const marked = await db.collection('cards').doc(cardId).update({
      data: { artStatus: 'processing' },
    }).catch(() => ({ stats: { updated: 0 } }));
    if (marked.stats && marked.stats.updated > 0) {
      try {
        await cloud.callFunction({ name: 'genCardArtTask', data: { cardId } });
      } catch (e) {
        // 触发失败：回滚为 pending，下次轮询可重试
        await db.collection('cards').doc(cardId).update({ data: { artStatus: 'pending' } }).catch(() => {});
      }
      // 重读拿最新状态（genCardArtTask 可能已置 done/failed 或仍 processing）
      const r2 = await db.collection('cards').doc(cardId).get().catch(() => ({ data: card }));
      const fresh = r2.data || card;
      return { ok: true, card: maskLocation(fresh, fresh.ownerOpenid === openid) };
    }
    // 标记未更新（已被并发标记 processing），直接返回当前状态，前端继续轮询
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
