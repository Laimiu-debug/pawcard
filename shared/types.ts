// shared/types.ts
// pawcard 共享类型（后端云函数用）。
// ⚠️ 前端镜像在 assets/scripts/core/Types.ts，改一处需改两处。

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type PetType = 'cat' | 'dog' | 'other';
export type ArtStatus = 'pending' | 'done' | 'failed';

export interface CatchLocation {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  publicArea: string;
}

export interface Card {
  _id: string;
  ownerOpenid: string;
  cardNo: number;
  name: string;
  rarity: Rarity;
  level: number;
  petType: PetType;
  furColor: string;
  traits: string[];
  originPhoto: string;
  artPhoto: string;
  artStatus: ArtStatus;
  desc: string;
  caughtAt: number;
  caughtLocation: CatchLocation | null;
  isPublic: boolean;
  createdAt: number;
}

export interface UserDoc {
  _id: string;
  openid: string;
  nickname: string;
  avatar: string;
  balls: number;
  ballsMax: number;
  ballsRecoveredAt: number;
  membership: { level: 'vip'; expireAt: number } | null;
  totalCaught: number;
  createdAt: number;
  updatedAt: number;
}

export interface RarityInput {
  featureScore: number;
  qualityScore: number;
  locationScore: number;
  timeScore: number;
  aiScore: number;
}

export interface RarityConfig {
  weights: { feature: number; quality: number; location: number; time: number; ai: number };
  thresholds: { N: number; R: number; SR: number; SSR: number; UR: number };
}

export interface RecoveryInput {
  currentBalls: number;
  max: number;
  recoveredAt: number;
  now: number;
  intervalMs: number;
}

export interface RecoveryOutput {
  newBalls: number;
  newRecoveredAt: number;
  recovered: number;
}

/** 识别结果（AI 识别服务输出） */
export interface RecognizeResult {
  isPet: boolean;
  petType: PetType;
  furColor: string;
  featureScore: number;
  qualityScore: number;
  aiScore: number;
}
