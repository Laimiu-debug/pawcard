// shared/art-provider.ts
// 「照片→炫酷卡牌」技术核心：阿里通义万相 图生图 API。
// 流程：fileID → getTempFileURL 换临时URL → 万相图生图(prompt+原图) → 下载结果 → 上传云存储 → 新 fileID。
// 无 DASHSCOPE_API_KEY 时 mock 兜底（直接返回原图），保证 MVP 链路可跑通。
import type { Rarity, RecognizeResult } from './types';

export interface ArtGenInput {
  originFileID: string;        // 原始照片云存储 fileID
  rarity: Rarity;
  recognize: RecognizeResult;  // 毛色/姿态，用于构建提示词
  /** 注入云能力：由云函数传入 cloud 实例，避免 shared 直接依赖 wx-server-sdk 类型 */
  cloud?: any;
}

export interface ArtGenOutput {
  artFileID: string;           // 重绘结果 fileID
  qualityScore: number;        // 0-1，质量分（过低触发重试）
  costEstimate: number;        // ¥/次
}

/**
 * 生成卡牌插画：拿用户的猫照片重绘成卡牌风格，保留原猫的辨识度。
 * 用万相图生图（image + prompt），提示词按稀有度分级，UR 最华丽。
 */
export async function generateCardArt(input: ArtGenInput): Promise<ArtGenOutput> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  // ---- mock 兜底（无 API Key 时）：直接返回原图，中等质量分不触发重试 ----
  if (!apiKey) {
    return { artFileID: input.originFileID, qualityScore: 0.7, costEstimate: 0 };
  }

  // ---- 真实接入：阿里万相图生图 ----
  const cloud = input.cloud;
  if (!cloud) throw new Error('art-provider 需要 cloud 实例');

  // 1. fileID → 临时下载 URL（万相需要公网可访问的图片 URL）
  const tempUrlRes = await cloud.getTempFileURL({ fileList: [input.originFileID] });
  const originUrl = tempUrlRes.fileList?.[0]?.tempFileURL;
  if (!originUrl) throw new Error('getTempFileURL failed');

  // 2. 调万相图生图：messages 格式，content 含 image（原图）+ text（卡牌风格提示词）
  const prompt = buildPrompt(input.rarity, input.recognize);
  const resp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      // X-DashScope-DataInspection: 启用内容安全（万相默认有，可不显式传）
    },
    body: JSON.stringify({
      model: 'wan2.7-imageedit',   // 图像编辑/图生图模型；纯文生图用 wan2.7-image-pro
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: originUrl },         // 原图：保住"还是那只猫"
              { text: prompt },             // 卡牌风格重绘指令
            ],
          },
        ],
      },
      parameters: {
        size: '1280*1280',                  // 卡牌近似方形
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`wanx api ${resp.status}: ${errText}`);
  }

  const data: any = await resp.json();
  // 3. 万相返回结果图的临时 URL（约 24h 有效）
  const contentArr = data?.output?.choices?.[0]?.message?.content;
  const resultImageUrl = Array.isArray(contentArr)
    ? contentArr.find((c: any) => c.image)?.image
    : undefined;
  if (!resultImageUrl) throw new Error('wanx no image in response');

  // 4. 下载结果图 → 上传回云存储，得到永久 fileID
  const imgResp = await fetch(resultImageUrl);
  if (!imgResp.ok) throw new Error('download result image failed');
  const buffer = Buffer.from(await imgResp.arrayBuffer());
  const uploadRes = await cloud.uploadFile({
    cloudPath: `cardart/${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`,
    fileContent: buffer,
  });

  return {
    artFileID: uploadRes.fileID,
    qualityScore: 0.8,   // 万相不返回质量分，给固定中等偏高分；过低才触发 genCardArtTask 重试
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
  return `把这只${rec.furColor}猫重绘成集换式卡牌插画风格，保留这只猫的外观、毛色和姿态特征，${flair[rarity]}，居中构图，大师级，高细节，卡牌边框留白`;
}
