export type CharacterId =
  | 'baili-shouyue'
  | 'mulan'
  | 'kai'
  | 'xuance'
  | 'grunt-mozhong'
  | 'elite-mozhong'
  | 'lanlingwang-boss';

export type CharacterCamp = 'player' | 'ally' | 'enemy' | 'boss';

export type CharacterAiMode =
  | 'idle'
  | 'patrol'
  | 'guard'
  | 'search'
  | 'chase'
  | 'kite'
  | 'attack'
  | 'burst'
  | 'retreat'
  | 'recover';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CharacterSnapshot {
  id: CharacterId;
  camp: CharacterCamp;
  hp: number;
  hpMax: number;
  stamina?: number;
  pressure?: number;
  visible: boolean;
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
  targetId?: CharacterId;
  mode: CharacterAiMode;
  tags?: string[];
}

export interface WorldSnapshot {
  missionTimeMs: number;
  mapId: 'great-wall-garrison';
  safeZone: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    gateX: number;
    gateWidth: number;
  };
  supplyMission: {
    objectiveCollected: number;
    objectiveNeed: number;
    returnSuggested: boolean;
  };
  lootSpots: Array<{
    id: string;
    position: Vec2;
    opened: boolean;
    tags: string[];
  }>;
  visibleThreats: CharacterSnapshot[];
}

export interface SkillDescriptor {
  id: string;
  name: string;
  cooldownMs: number;
  range: number;
  notes?: string;
}

export interface CharacterAiProfile {
  id: CharacterId;
  displayName: string;
  camp: CharacterCamp;
  description: string;
  defaultMode: CharacterAiMode;
  skills: SkillDescriptor[];
}

export interface AiDecisionRequest {
  actor: CharacterSnapshot;
  allies: CharacterSnapshot[];
  enemies: CharacterSnapshot[];
  world: WorldSnapshot;
  memory?: Record<string, unknown>;
}

export type AiAction =
  | {
      type: 'move';
      destination: Vec2;
      speedScale?: number;
      reason?: string;
    }
  | {
      type: 'attack';
      targetId: CharacterId;
      skillId?: string;
      reason?: string;
    }
  | {
      type: 'cast';
      skillId: string;
      targetId?: CharacterId;
      targetPosition?: Vec2;
      reason?: string;
    }
  | {
      type: 'speak';
      text: string;
      channel: 'combat' | 'tactical' | 'warning';
    }
  | {
      type: 'mark';
      targetId: CharacterId;
      label: string;
    }
  | {
      type: 'wait';
      durationMs: number;
      reason?: string;
    };

export interface AiDecisionResponse {
  actorId: CharacterId;
  nextMode: CharacterAiMode;
  actions: AiAction[];
  memoryPatch?: Record<string, unknown>;
}

export interface CharacterAiAdapter {
  profile: CharacterAiProfile;
  decide(input: AiDecisionRequest): Promise<AiDecisionResponse>;
}

export interface GreatWallAiRoster {
  player: CharacterAiProfile;
  mulan: CharacterAiProfile;
  kai: CharacterAiProfile;
  xuance: CharacterAiProfile;
  gruntMozhong: CharacterAiProfile;
  eliteMozhong: CharacterAiProfile;
  lanlingwangBoss: CharacterAiProfile;
}

export const GREAT_WALL_AI_ROSTER: GreatWallAiRoster = {
  player: {
    id: 'baili-shouyue',
    displayName: '百里守约',
    camp: 'player',
    description: '受命出城搜集军粮、药品和守城物资的远程狙击核心。',
    defaultMode: 'guard',
    skills: [
      { id: 'scan', name: '静谧之眼', cooldownMs: 18000, range: 180 },
      { id: 'charged-shot', name: '狂风之息', cooldownMs: 12000, range: 880 },
      { id: 'back-dash', name: '后撤反击', cooldownMs: 8000, range: 160 },
    ],
  },
  mulan: {
    id: 'mulan',
    displayName: '花木兰',
    camp: 'ally',
    description: '长城守卫军统帅，负责围城局势判断、城门防线与补给调度。',
    defaultMode: 'guard',
    skills: [
      { id: 'command', name: '战术指令', cooldownMs: 6000, range: 900 },
      { id: 'gate-hold', name: '守门反冲', cooldownMs: 9000, range: 220 },
    ],
  },
  kai: {
    id: 'kai',
    displayName: '铠',
    camp: 'ally',
    description: '负责近战守线、护送补给回线的前线支援角色。',
    defaultMode: 'guard',
    skills: [
      { id: 'frontline-cut', name: '前线突斩', cooldownMs: 8000, range: 180 },
      { id: 'cover-push', name: '压线掩护', cooldownMs: 12000, range: 320 },
    ],
  },
  xuance: {
    id: 'xuance',
    displayName: '百里玄策',
    camp: 'ally',
    description: '高速侦查外线敌情、回传补给点动向的机动侦察手。',
    defaultMode: 'search',
    skills: [
      { id: 'threat-mark', name: '目标标记', cooldownMs: 4000, range: 1200 },
      { id: 'trail-report', name: '追迹回传', cooldownMs: 7000, range: 1200 },
    ],
  },
  gruntMozhong: {
    id: 'grunt-mozhong',
    displayName: '魔种杂兵',
    camp: 'enemy',
    description: '普通近战敌人，成群压迫。',
    defaultMode: 'patrol',
    skills: [{ id: 'claw', name: '扑咬', cooldownMs: 650, range: 34 }],
  },
  eliteMozhong: {
    id: 'elite-mozhong',
    displayName: '精英魔种',
    camp: 'enemy',
    description: '高机动高生命值单位，负责切后排。',
    defaultMode: 'chase',
    skills: [
      { id: 'rush', name: '重压冲锋', cooldownMs: 2600, range: 220 },
      { id: 'smash', name: '撕裂重击', cooldownMs: 1200, range: 40 },
    ],
  },
  lanlingwangBoss: {
    id: 'lanlingwang-boss',
    displayName: '兰陵王',
    camp: 'boss',
    description: '潜行接近、标记爆发、极高斩杀能力的 boss。',
    defaultMode: 'search',
    skills: [
      { id: 'stealth-approach', name: '潜行逼近', cooldownMs: 7000, range: 900, notes: '短时降低可见度并快速接近玩家。' },
      { id: 'shadow-mark', name: '影蚀标记', cooldownMs: 5000, range: 560, notes: '命中后进入斩杀窗口。' },
      { id: 'assassinate', name: '暗袭斩杀', cooldownMs: 8500, range: 240, notes: '高爆发突进，目标血量过低时可能秒杀。' },
    ],
  },
};
