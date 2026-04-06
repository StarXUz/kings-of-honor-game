export type EliteType = 'brute' | 'hunter';

export interface EliteRuntimeConfig {
  type: EliteType;
  displayName: string;
  tint: number;
  accentTint: number;
  scale: number;
  maxHp: number;
  speed: number;
  attackDamage: number;
  chaseRadius: number;
  deathDropBonus: number;
  searchKeywords: string[];
  aiPrompt: string;
}

export const ELITE_CONFIGS: Record<EliteType, EliteRuntimeConfig> = {
  brute: {
    type: 'brute',
    displayName: '重装魔种精英',
    tint: 0xb46254,
    accentTint: 0xffb08d,
    scale: 46,
    maxHp: 260,
    speed: 92,
    attackDamage: 22,
    chaseRadius: 420,
    deathDropBonus: 2,
    searchKeywords: [
      '王者荣耀 魔种 重装 精英 原画',
      'Honor of Kings armored monster concept art',
      '中式奇幻 重装精英怪 设定图',
    ],
    aiPrompt:
      'Honor of Kings inspired heavy elite demonic brute, eastern fantasy battlefield monster, black iron armor, dark red glow, huge weapon, bone spikes, readable silhouette for top down action game sprite reference, simple background, not western demon',
  },
  hunter: {
    type: 'hunter',
    displayName: '猎杀号精英魔种',
    tint: 0xcf574f,
    accentTint: 0xffc1a5,
    scale: 40,
    maxHp: 190,
    speed: 138,
    attackDamage: 15,
    chaseRadius: 540,
    deathDropBonus: 2,
    searchKeywords: [
      '王者荣耀 魔种 猎杀 精英 原画',
      'Honor of Kings agile monster concept art',
      '中式奇幻 猎杀型精英怪 设定图',
    ],
    aiPrompt:
      'Honor of Kings inspired hunter elite demonic creature, eastern fantasy magical battlefield enemy, lean agile body, claws and bone blades, crimson glowing patterns, readable silhouette for top down action game sprite reference, simple background',
  },
};

export function getEliteConfig(type: EliteType): EliteRuntimeConfig {
  return ELITE_CONFIGS[type];
}
