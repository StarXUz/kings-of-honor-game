export type CharacterVisualId =
  | 'shouyue'
  | 'mulan'
  | 'kai'
  | 'xuance'
  | 'grunt-mozhong'
  | 'elite-brute'
  | 'elite-hunter';

export interface CharacterVisualSpec {
  id: CharacterVisualId;
  displayName: string;
  silhouette: string;
  bodyKeywords: string[];
  primaryColor: string;
  accentColor: string;
  weaponMarker: string;
  moveRhythm: string;
  idlePose: string;
  patrolPose?: string;
  observePose?: string;
  attackPose: string;
  hurtPose: string;
  deathPose: string;
  idleTilt: number;
  walkTilt: number;
  runTilt: number;
  bounce: number;
  shadowPulse: number;
  searchKeywords: string[];
  aiPrompt: string;
}

export const CHARACTER_VISUAL_SPECS: Record<CharacterVisualId, CharacterVisualSpec> = {
  shouyue: {
    id: 'shouyue',
    displayName: '百里守约',
    silhouette: '修长狙击手，肩枪轮廓清晰，站姿稳定',
    bodyKeywords: ['东方幻想狙击手', '长城守卫军', '轻甲', '长枪械'],
    primaryColor: '#4a5f69',
    accentColor: '#d4b27b',
    weaponMarker: '细长狙击枪、架枪姿态、肩部枪托',
    moveRhythm: '步幅克制，移动轻，停下时像立即进入瞄准',
    idlePose: '重心稳定，枪身压低但随时可抬起',
    patrolPose: '低调巡查，观察路线，枪口不过分晃动',
    observePose: '抬枪半准备姿态，重心前压，视线锁定远处',
    attackPose: '普通射击时抬枪干脆，二技能时架枪明显',
    hurtPose: '上身短促后仰，马上重新稳住',
    deathPose: '失去重心后向侧前方倒下，枪械仍有存在感',
    idleTilt: 1.4,
    walkTilt: 3.2,
    runTilt: 5.2,
    bounce: 0.03,
    shadowPulse: 0.08,
    searchKeywords: [
      '王者荣耀 百里守约 原画',
      'Honor of Kings Baili Shouyue concept art',
      'top down sniper hero sprite reference',
    ],
    aiPrompt:
      'Honor of Kings inspired eastern fantasy sniper hero, Great Wall defender, slim silhouette, long precision rifle, stable stance, clear weapon read, suitable for top down action game sprite and animation reference, simple background, high readability, no poster composition',
  },
  mulan: {
    id: 'mulan',
    displayName: '花木兰',
    silhouette: '中等偏高体型，披风与肩甲形成统帅轮廓',
    bodyKeywords: ['东方幻想女武将', '长城指挥官', '披风', '轻重甲结合'],
    primaryColor: '#8a4c48',
    accentColor: '#d0a66b',
    weaponMarker: '长剑与披风轮廓，肩甲和头饰清晰',
    moveRhythm: '稳、克制、带命令感，步伐少但重心很稳',
    idlePose: '站姿收紧，像随时发令',
    patrolPose: '在城门与防线核心区缓慢巡视',
    observePose: '转身观察城门、烽火台和前线态势',
    attackPose: '拔剑干净，动作不拖泥带水',
    hurtPose: '后撤半步但姿态不散',
    deathPose: '指挥官式失衡倒下，仍保留武将轮廓',
    idleTilt: 1.2,
    walkTilt: 2.8,
    runTilt: 4.2,
    bounce: 0.02,
    shadowPulse: 0.07,
    searchKeywords: [
      '王者荣耀 花木兰 原画 长城守卫军',
      'Honor of Kings Mulan Great Wall defender art',
      'female commander eastern fantasy sprite reference',
    ],
    aiPrompt:
      'Honor of Kings inspired Hua Mulan style commander, eastern fantasy Great Wall general, disciplined silhouette, cape and shoulder armor, readable weapon shape, suitable for top down action game character concept and sprite animation reference, simple background, strong silhouette, not a poster',
  },
  kai: {
    id: 'kai',
    displayName: '铠',
    silhouette: '宽肩重装战士，厚重胸甲与巨刃清晰',
    bodyKeywords: ['重装近战', '东方幻想战士', '大剑', '厚重护甲'],
    primaryColor: '#355064',
    accentColor: '#c3d2df',
    weaponMarker: '宽刃大剑、厚重肩甲、前倾压迫姿态',
    moveRhythm: '沉、硬、步伐重，停顿像随时正面迎击',
    idlePose: '双脚稳，重心前压，像守住一道线',
    patrolPose: '沿前线小范围来回巡防',
    observePose: '半转身盯住危险方向，像在替玩家挡线',
    attackPose: '挥斩硬朗，前倾压迫强',
    hurtPose: '短促震退后继续站稳',
    deathPose: '沉重倒地，甲胄重量感明显',
    idleTilt: 0.9,
    walkTilt: 2.4,
    runTilt: 4.1,
    bounce: 0.018,
    shadowPulse: 0.06,
    searchKeywords: [
      '王者荣耀 铠 原画',
      'Honor of Kings Kai concept art',
      'heavy armored melee hero top down sprite reference',
    ],
    aiPrompt:
      'Honor of Kings inspired armored melee guardian, broad silhouette, huge blade, eastern fantasy heavy frontline warrior, readable armor mass, suitable for top down action game sprite and animation reference, clean background, highly readable silhouette',
  },
  xuance: {
    id: 'xuance',
    displayName: '百里玄策',
    silhouette: '机敏修长，锁链与骨刃形成灵活轮廓',
    bodyKeywords: ['侦查突袭', '东方幻想少年猎手', '锁链武器', '高机动'],
    primaryColor: '#6b372f',
    accentColor: '#cf7b5c',
    weaponMarker: '锁链与镰刃、快速换重心、机敏停顿',
    moveRhythm: '快、轻、突然变向，停顿也像在观察',
    idlePose: '半侧身，像下一秒就换点',
    patrolPose: '侧翼与外线快速游走',
    observePose: '抬头听动静，身体不完全静止',
    attackPose: '向前探身，武器甩动明显',
    hurtPose: '受击后弹开但很快回到机动状态',
    deathPose: '轻型角色的失衡翻倒',
    idleTilt: 1.6,
    walkTilt: 4.2,
    runTilt: 6.2,
    bounce: 0.04,
    shadowPulse: 0.09,
    searchKeywords: [
      '王者荣耀 百里玄策 原画',
      'Honor of Kings Baili Xuance concept art',
      'agile scout hero top down sprite reference',
    ],
    aiPrompt:
      'Honor of Kings inspired agile scout fighter, eastern fantasy chain blade hunter, fast silhouette, youthful but dangerous, suitable for top down action game sprite and animation reference, simple background, readable silhouette, no poster layout',
  },
  'grunt-mozhong': {
    id: 'grunt-mozhong',
    displayName: '普通魔种',
    silhouette: '矮壮魔化士兵，爪和背刺清晰',
    bodyKeywords: ['中式奇幻魔种', '魔化步兵', '侵袭感'],
    primaryColor: '#603126',
    accentColor: '#e2a15b',
    weaponMarker: '利爪、骨刺、侵袭姿态',
    moveRhythm: '巡逻时松散，扑击时突然前冲',
    idlePose: '含胸弓背，随时扑上来',
    observePose: '头部微偏，像在嗅到目标',
    attackPose: '短促前扑、爪击明显',
    hurtPose: '受击后抖开，凶性不减',
    deathPose: '迅速塌下去，带怪物僵硬感',
    idleTilt: 1.8,
    walkTilt: 4.8,
    runTilt: 7.0,
    bounce: 0.045,
    shadowPulse: 0.11,
    searchKeywords: [
      '王者荣耀 魔种 怪物 原画',
      'Honor of Kings monster concept art',
      'eastern fantasy corrupted creature top down sprite reference',
    ],
    aiPrompt:
      'Honor of Kings inspired demonic minion, eastern fantasy corrupted soldier, clawed creature, readable silhouette for top down action game, simple background, sprite and animation reference, not western demon, not zombie',
  },
  'elite-brute': {
    id: 'elite-brute',
    displayName: '重装魔种精英',
    silhouette: '厚重黑铁魔甲，双臂粗壮，巨大武器和骨刺',
    bodyKeywords: ['黑铁', '暗红', '重甲', '骨刺', '巨大武器', '压迫站姿'],
    primaryColor: '#4b2622',
    accentColor: '#c95541',
    weaponMarker: '巨型重刃/重锤、厚甲、前摇夸张',
    moveRhythm: '平时慢，技能前摇明显，释放时压迫感强',
    idlePose: '沉重立定，像一堵会动的墙',
    attackPose: '蓄力后砸下或直线冲锋',
    hurtPose: '身形晃动但不轻易后退',
    deathPose: '重甲倾覆，重量感突出',
    idleTilt: 0.8,
    walkTilt: 2.6,
    runTilt: 3.8,
    bounce: 0.016,
    shadowPulse: 0.05,
    searchKeywords: [
      '王者荣耀 魔种 精英 原画',
      '中式奇幻 重装精英怪 设定图',
      'Honor of Kings armored monster concept art',
    ],
    aiPrompt:
      'High tier demonic brute in Honor of Kings inspired eastern fantasy style, black iron armor, dark red glow, giant weapon, bone spikes, oppressive silhouette, suitable for top down action game elite monster sprite and animation reference, simple background, highly readable shape',
  },
  'elite-hunter': {
    id: 'elite-hunter',
    displayName: '猎杀号精英魔种',
    silhouette: '修长躯体、骨刃与猩红纹路形成危险轮廓',
    bodyKeywords: ['修长', '迅捷', '利爪', '骨刃', '猩红纹路', '危险灵活'],
    primaryColor: '#302322',
    accentColor: '#cf433f',
    weaponMarker: '骨刃与利爪、长肢体、前扑姿态',
    moveRhythm: '侧移、扑击、短暂停顿后突然逼近',
    idlePose: '半匍匐，像在等待扑杀时机',
    attackPose: '锁定后横移与扑击衔接',
    hurtPose: '受击后瞬时缩身，再次准备扑上',
    deathPose: '四肢失衡甩开，怪物速度感仍明显',
    idleTilt: 1.4,
    walkTilt: 5.2,
    runTilt: 7.4,
    bounce: 0.05,
    shadowPulse: 0.12,
    searchKeywords: [
      '王者荣耀 魔种 精英 怪物 原画',
      '中式奇幻 猎杀型精英怪 设定图',
      'Honor of Kings agile monster concept art',
    ],
    aiPrompt:
      'High tier demonic hunter in Honor of Kings inspired eastern fantasy style, lean agile body, claws and bone blades, crimson glowing patterns, dangerous fast silhouette, suitable for top down action game elite monster sprite and animation reference, simple background, strong readability',
  },
};

export function getCharacterVisualSpec(id: CharacterVisualId): CharacterVisualSpec {
  return CHARACTER_VISUAL_SPECS[id];
}
