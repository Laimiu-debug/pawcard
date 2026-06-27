// cloudfunctions/catchPet/recognize.js
// 宠物识别：判断是否猫、毛色、特征分/质量分/AI分。
// TODO(真实接入): 调用微信图像识别或多模态大模型。MVP 用 mock 兜底。
async function recognize(fileID) {
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  return {
    isPet: true,
    petType: 'cat',
    furColor: ['橘猫', '三花', '奶牛', '黑猫', '白猫'][rand(0, 5)],
    featureScore: rand(20, 90),
    qualityScore: rand(40, 95),
    aiScore: rand(30, 90),
  };
}
module.exports = { recognize };
