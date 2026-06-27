// shared/art-provider.ts
// 「照片→炫酷卡牌」的技术核心：图生图 + ControlNet。
// 封装为可替换接口：配了 ART_API_URL/ART_API_KEY 走真实云端图生图 API，
// 否则 mock 兜底（直接用原图返回），保证 MVP 链路可跑通。
import type { Rarity, RecognizeResult } from './types';

export interface ArtGenInput {
  originFileID: string;        // 原始照片云存储 fileID
  rarity: Rarity;
  recognize: RecognizeResult;  // 毛色/姿态等，用于构建提示词
}

export interface ArtGenOutput {
  artFileID: string;           // 重绘结果 fileID
  qualityScore: number;        // 0-1，质量分（过低触发重试）
  costEstimate: number;        // ¥/次
}

/**
 * 生成卡牌插画：ControlNet 锁猫的轮廓/姿态（保证"还是那只猫"），画风换卡牌风格。
 * 提示词按稀有度分级，UR 最华丽。
 */
export async function generateCardArt(input: ArtGenInput): Promise<ArtGenOutput> {
  const apiUrl = process.env.ART_API_URL;
  const apiKey = process.env.ART_API_KEY;

  // ---- mock 兜底（无 API 配置时）：直接返回原图，中等质量分不触发重试 ----
  if (!apiUrl || !apiKey) {
    return { artFileID: input.originFileID, qualityScore: 0.7, costEstimate: 0 };
  }

  // ---- 真实接入：云端图生图 + ControlNet ----
  const prompt = buildPrompt(input.rarity, input.recognize);
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      mode: 'img2img',
      controlnet: 'canny',          // 锁轮廓，保留猫的辨识度
      init_image: input.originFileID,
      prompt,
      strength: 0.6,                // 0.5-0.7：保留原图结构同时换画风
      num_images: 1,
    }),
  });

  if (!resp.ok) {
    throw new Error(`art api error ${resp.status}`);
  }
  const data: any = await resp.json();
  return {
    artFileID: data.image_file_id,   // API 返回的图（已上传或需再上传云存储）
    qualityScore: data.quality_score ?? 0.7,
    costEstimate: 0.2,
  };
}

/** 按稀有度构建卡牌风格提示词，稀有度越高越华丽。 */
function buildPrompt(rarity: Rarity, rec: RecognizeResult): string {
  const flair: Record<Rarity, string> = {
    N: '简洁清新插画',
    R: '精致卡牌插画，柔和光效',
    SR: '华丽卡牌插画，魔法光效，丰富细节',
    SSR: '史诗传说级卡牌，金光粒子，神圣光晕，极高细节',
    UR: '幻兽级史诗卡牌，全屏彩虹光爆裂，传说气场，极致华丽',
  };
  return `${rec.furColor} 猫，${flair[rarity]}，居中构图，TCG 集换式卡牌风格，大师级`;
}
