import Phaser from 'phaser';
import './style.css';

type ItemKind = 'ammo' | 'medical' | 'material';
type WeaponId = '狙击枪';
type AmmoType = 'sniper';
type PlayerState = 'idle' | 'walk' | 'fire' | 'hurt';

interface ItemStack {
  id: string;
  label: string;
  kind: ItemKind;
  count: number;
}

interface WeaponConfig {
  id: WeaponId;
  damage: number;
  fireDelay: number;
  magSize: number;
  reloadMs: number;
  spreadDeg: number;
  projectileSpeed: number;
  auto: boolean;
  ammoType?: AmmoType;
  isMelee: boolean;
}

interface EnemyUnit {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  hp: number;
  wanderDir: Phaser.Math.Vector2;
  lastAttackAt: number;
}

interface LootContainer {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  title: string;
  items: ItemStack[];
  opened: boolean;
}

interface NpcUnit {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  name: string;
  role: string;
  line: string;
}

interface MissionSetupConfig {
  mode: 'standard' | 'pressure';
  aiAssistant: boolean;
}

const DEFAULT_MISSION_CONFIG: MissionSetupConfig = {
  mode: 'standard',
  aiAssistant: true,
};

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const NORMAL_ATTACK_RANGE = 420;
const SNIPE_ATTACK_RANGE = 880;
const GREAT_WALL_POINTS: Array<{ x: number; y: number }> = [
  { x: 110, y: 888 },
  { x: 320, y: 744 },
  { x: 560, y: 730 },
  { x: 820, y: 588 },
  { x: 1080, y: 564 },
  { x: 1340, y: 422 },
  { x: 1780, y: 414 },
];

const WEAPON_CONFIG: Record<WeaponId, WeaponConfig> = {
  狙击枪: {
    id: '狙击枪',
    damage: 78,
    fireDelay: 480,
    magSize: 5,
    reloadMs: 1800,
    spreadDeg: 0.8,
    projectileSpeed: 780,
    auto: false,
    ammoType: 'sniper',
    isMelee: false,
  },
};

const PLAYER_STATE_PRIORITY: Record<PlayerState, number> = {
  idle: 1,
  walk: 2,
  fire: 3,
  hurt: 4,
};

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b1114');

    const g = this.add.graphics();
    g.fillStyle(0x0f1a1d, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x16262b, 1).fillRect(120, 80, 1040, 560);
    g.lineStyle(2, 0x2d4b52, 0.9).strokeRect(120, 80, 1040, 560);

    this.add.text(640, 174, '王者荣耀·长城试炼', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '56px',
      color: '#d8e3d7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 246, '百里守约 AI 战术训练系统', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      color: '#9cbdb0',
    }).setOrigin(0.5);

    this.add.text(640, 332, '核心玩法：搜集物资  战术交火  动态撤离', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '19px',
      color: '#b9c8bf',
    }).setOrigin(0.5);

    this.add.text(640, 366, '交互：WASD移动  鼠标瞄准射击  R换弹  F交互  Q/E/Space技能', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#8ea99f',
    }).setOrigin(0.5);

    const enterBtn = this.add.rectangle(640, 462, 380, 74, 0x284b4f, 0.96)
      .setStrokeStyle(2, 0x73b4a1)
      .setInteractive({ useHandCursor: true });
    const enterTxt = this.add.text(640, 462, '进入 AI 训练室', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '30px',
      color: '#e7f3ec',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [enterBtn, enterTxt],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });

    const storyBtn = this.add.rectangle(640, 544, 320, 56, 0x1c2f36, 0.96)
      .setStrokeStyle(2, 0x5f8f96)
      .setInteractive({ useHandCursor: true });
    this.add.text(640, 544, '查看世界观前情', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#cde4db',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const storyPanelBg = this.add.rectangle(640, 360, 920, 440, 0x0f171b, 0.96)
      .setStrokeStyle(2, 0x567b83)
      .setVisible(false);
    const storyPanelText = this.add.text(640, 330, [
      '【前情提要】',
      '长城守卫军被魔种围困，外部补给线断裂。',
      '百里守约受命进入 AI 虚拟训练舱，',
      '在高仿真战术沙盘中反复演练“搜集-战斗-撤离”。',
      '',
      '花木兰负责任务指挥，铠与百里玄策提供战术联动。',
      '玩家将以守约身份，完成极限条件下的物资回收行动。',
    ].join('\n'), {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      lineSpacing: 8,
      color: '#e3eee8',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    const closeStoryBtn = this.add.rectangle(640, 528, 180, 54, 0x2a494f, 0.98)
      .setStrokeStyle(2, 0x84c3af)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    const closeStoryTxt = this.add.text(640, 528, '关闭', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#eaf5ef',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    storyBtn.on('pointerdown', () => {
      storyPanelBg.setVisible(true);
      storyPanelText.setVisible(true);
      closeStoryBtn.setVisible(true);
      closeStoryTxt.setVisible(true);
    });
    closeStoryBtn.on('pointerdown', () => {
      storyPanelBg.setVisible(false);
      storyPanelText.setVisible(false);
      closeStoryBtn.setVisible(false);
      closeStoryTxt.setVisible(false);
    });

    enterBtn.on('pointerdown', () => this.scene.start('TrainingRoomScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('TrainingRoomScene'));
  }
}

class TrainingRoomScene extends Phaser.Scene {
  private selectedMode: MissionSetupConfig['mode'] = 'standard';
  private aiAssistant = true;

  constructor() {
    super('TrainingRoomScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a1114');
    const g = this.add.graphics();
    g.fillStyle(0x0d171b, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x142126, 1).fillRect(80, 68, 1120, 584);
    g.lineStyle(2, 0x2f4a52, 0.95).strokeRect(80, 68, 1120, 584);
    g.fillStyle(0x0b1418, 1).fillRoundedRect(118, 124, 1044, 482, 12);

    this.add.text(640, 112, 'AI 电竞训练室', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '42px',
      color: '#dbe8de',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 156, '局前配置：训练强度与 AI 辅助策略', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '17px',
      color: '#8fb6aa',
    }).setOrigin(0.5);

    const modeStandard = this.add.rectangle(410, 286, 340, 176, 0x1b2f35, 0.95)
      .setStrokeStyle(2, 0x5a8a8a)
      .setInteractive({ useHandCursor: true });
    const modePressure = this.add.rectangle(870, 286, 340, 176, 0x2b2720, 0.95)
      .setStrokeStyle(2, 0x8b6a47)
      .setInteractive({ useHandCursor: true });

    this.add.text(410, 236, '标准试炼', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '30px',
      color: '#dcece6',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(410, 292, '适合答辩演示：', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '15px',
      color: '#9bc7bb',
    }).setOrigin(0.5);
    this.add.text(410, 318, '目标3件核心物资，敌情增援较缓', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '14px',
      color: '#9bc7bb',
    }).setOrigin(0.5);

    this.add.text(870, 236, '高压试炼', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '30px',
      color: '#f2dcc4',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(870, 292, '强化挑战：', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '15px',
      color: '#e0bf98',
    }).setOrigin(0.5);
    this.add.text(870, 318, '目标4件核心物资，敌情增援更快', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '14px',
      color: '#e0bf98',
    }).setOrigin(0.5);

    const aiToggle = this.add.rectangle(640, 424, 740, 78, 0x1e332f, 0.9)
      .setStrokeStyle(2, 0x5da18c)
      .setInteractive({ useHandCursor: true });
    const aiText = this.add.text(640, 424, '', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#e3efe8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const renderSelections = (): void => {
      const standardActive = this.selectedMode === 'standard';
      modeStandard.setStrokeStyle(standardActive ? 3 : 2, standardActive ? 0x8fd3bf : 0x5a8a8a);
      modePressure.setStrokeStyle(!standardActive ? 3 : 2, !standardActive ? 0xffc07d : 0x8b6a47);
      aiText.setText(`AI 辅助：${this.aiAssistant ? '开启（局内战术提示 + 局后复盘）' : '关闭（纯手动作战）'} ｜ 点击切换`);
      aiToggle.setFillStyle(this.aiAssistant ? 0x1e332f : 0x2d2b2b, 0.9);
    };
    renderSelections();

    modeStandard.on('pointerdown', () => {
      this.selectedMode = 'standard';
      renderSelections();
    });
    modePressure.on('pointerdown', () => {
      this.selectedMode = 'pressure';
      renderSelections();
    });
    aiToggle.on('pointerdown', () => {
      this.aiAssistant = !this.aiAssistant;
      renderSelections();
    });

    const backBtn = this.add.rectangle(430, 548, 250, 64, 0x1c282d, 0.96)
      .setStrokeStyle(2, 0x55727a)
      .setInteractive({ useHandCursor: true });
    this.add.text(430, 548, '返回主菜单', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '26px',
      color: '#d4e0e4',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const nextBtn = this.add.rectangle(850, 548, 310, 64, 0x274e4f, 0.96)
      .setStrokeStyle(2, 0x77b5a6)
      .setInteractive({ useHandCursor: true });
    this.add.text(850, 548, '下一步：任务简报', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '26px',
      color: '#e8f4ee',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
    nextBtn.on('pointerdown', () => {
      this.registry.set('missionConfig', {
        mode: this.selectedMode,
        aiAssistant: this.aiAssistant,
      } satisfies MissionSetupConfig);
      this.scene.start('BriefingScene');
    });
  }
}

class BriefingScene extends Phaser.Scene {
  constructor() {
    super('BriefingScene');
  }

  create(): void {
    const cfg = this.readConfig();

    this.cameras.main.setBackgroundColor('#100f12');
    const g = this.add.graphics();
    g.fillStyle(0x130f12, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x1f171b, 1).fillRect(120, 64, 1040, 592);
    g.lineStyle(2, 0x65484a, 0.92).strokeRect(120, 64, 1040, 592);

    this.add.text(640, 112, '长城外任务简报', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '44px',
      color: '#f1d6bc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 160, `训练模式：${cfg.mode === 'pressure' ? '高压试炼' : '标准试炼'} ｜ AI辅助：${cfg.aiAssistant ? '开启' : '关闭'}`, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#d2b39d',
    }).setOrigin(0.5);

    const lines = [
      '【背景】长城守卫军被围困，补给链断裂，需由百里守约执行高风险外出搜寻任务。',
      '【目标】进入长城外据点，收集核心物资并完成战术撤离。',
      `【成功条件】收集${cfg.mode === 'pressure' ? 4 : 3}份核心物资 + 在激活撤离区连续停留3.2秒。`,
      '【战术要点】',
      '1) 主武器仅保留狙击枪，弹药有限，必须边战斗边搜集。',
      '2) Q 静谧之眼：部署侦查圈，标记附近魔种。',
      '3) E 狂风之息：下一发狙击强化，适合先手击杀。',
      '4) Space 逃脱：短位移脱离火线，保证安全撤离。',
      `5) ${cfg.aiAssistant ? 'AI教练已接入：将给出实时提示与复盘入口。' : '当前为纯手动模式：不显示 AI 战术辅助。'}`,
    ];

    lines.forEach((line, idx) => {
      this.add.text(160, 214 + idx * 38, line, {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: idx >= 3 ? '23px' : '20px',
        color: idx === 3 ? '#ffcc9f' : '#efe4d7',
      });
    });

    const backBtn = this.add.rectangle(426, 598, 240, 64, 0x2b2326, 0.95)
      .setStrokeStyle(2, 0x8c6c70)
      .setInteractive({ useHandCursor: true });
    this.add.text(426, 598, '返回训练室', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '26px',
      color: '#f1dde0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const startBtn = this.add.rectangle(854, 598, 340, 64, 0x5a3a2a, 0.97)
      .setStrokeStyle(2, 0xc4936c)
      .setInteractive({ useHandCursor: true });
    this.add.text(854, 598, '开始任务（Enter）', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      color: '#fff4e6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const startMission = (): void => {
      this.scene.start('MissionScene', cfg);
    };
    backBtn.on('pointerdown', () => this.scene.start('TrainingRoomScene'));
    startBtn.on('pointerdown', startMission);
    this.input.keyboard?.on('keydown-ENTER', startMission);
  }

  private readConfig(): MissionSetupConfig {
    const fromRegistry = this.registry.get('missionConfig') as MissionSetupConfig | undefined;
    return {
      ...DEFAULT_MISSION_CONFIG,
      ...(fromRegistry ?? {}),
    };
  }
}

class MissionScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private crosshair!: Phaser.GameObjects.Graphics;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private enemies: EnemyUnit[] = [];
  private lootContainers: LootContainer[] = [];
  private npcs: NpcUnit[] = [];
  private obstacleZones: Phaser.GameObjects.Zone[] = [];

  private hp = 100;
  private stamina = 100;
  private pressure = 0;
  private elapsedMs = 0;
  private missionStartAt = 0;
  private reinforceAt = 17000;

  private weaponSlots: WeaponId[] = ['狙击枪'];
  private weaponMags: Record<WeaponId, number> = {
    狙击枪: WEAPON_CONFIG.狙击枪.magSize,
  };
  private reserveAmmo: Record<AmmoType, number> = {
    sniper: 24,
  };

  private lastFireAt = 0;
  private reloadFinishAt = 0;
  private lastInteractAt = 0;
  private lastBagToggleAt = 0;
  private pointerWasDown = false;
  private resultShown = false;
  private skillScanReadyAt = 0;
  private skillSnipeReadyAt = 0;
  private skillDashReadyAt = 0;
  private skillDashEndAt = 0;
  private skillDashDir = new Phaser.Math.Vector2(1, 0);
  private aimDir = new Phaser.Math.Vector2(1, 0);
  private scoutEyes: Array<{ x: number; y: number; expireAt: number; ring: Phaser.GameObjects.Arc }> = [];
  private skillSnipeBuffShots = 0;
  private playerVisualState: PlayerState = 'idle';
  private playerStateUntil = 0;
  private playerStateLockPriority = 0;
  private audioCtx?: AudioContext;

  private inventory: ItemStack[] = [
    { id: 'med_kit', label: '守军急救包', kind: 'medical', count: 1 },
    { id: 'sniper_ammo', label: '狙击专用弹', kind: 'ammo', count: 8 },
  ];
  private inventoryCap = 16;
  private activeLoot?: LootContainer;
  private lootPanelOpen = false;

  private extractionZones: Phaser.GameObjects.Rectangle[] = [];
  private activeExtractIndex = 0;
  private extractionSwitchAt = 30000;
  private extractionProgress = 0;
  private extractionNeedMs = 3200;
  private objectiveCollected = 0;
  private objectiveNeed = 3;
  private missionConfig: MissionSetupConfig = { ...DEFAULT_MISSION_CONFIG };
  private aiAssistantEnabled = true;

  private hudTop!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudRisk!: Phaser.GameObjects.Text;
  private skillBoard!: Phaser.GameObjects.Text;
  private npcDialog!: Phaser.GameObjects.Text;
  private npcDialogHideEvent?: Phaser.Time.TimerEvent;
  private banner!: Phaser.GameObjects.Text;

  private hotbarSlots: Array<{ box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; ammo: Phaser.GameObjects.Text }> = [];

  private lootPanelBg!: Phaser.GameObjects.Rectangle;
  private lootTitle!: Phaser.GameObjects.Text;
  private invHeader!: Phaser.GameObjects.Text;
  private boxHeader!: Phaser.GameObjects.Text;
  private invList: Phaser.GameObjects.Text[] = [];
  private boxList: Phaser.GameObjects.Text[] = [];
  private atmosphereVignette!: Phaser.GameObjects.Graphics;
  private atmosphereFog!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('MissionScene');
  }

  preload(): void {
    this.load.image('official_shouyue', '/assets/official/shouyue.png');
    this.load.image('official_mozhong', '/assets/official/mozhong.png');
    this.load.image('official_supply_box', '/assets/official/supply_box.png');
    this.load.image('official_npc_mulan', '/assets/official/npc_mulan.png');
    this.load.image('official_npc_kai', '/assets/official/npc_kai.png');
    this.load.image('official_npc_xuance', '/assets/official/npc_xuance.png');
    this.load.image('official_desert_bg', '/assets/official/desert_bg.png');
    this.load.image('shouyue_state_idle', '/assets/custom/shouyue_walk.png');
    this.load.image('shouyue_state_walk', '/assets/custom/shouyue_walk.png');
    this.load.image('shouyue_state_fire', '/assets/custom/shouyue_fire_alt.png');
    this.load.image('shouyue_state_hurt', '/assets/custom/shouyue_hurt.png');
  }

  create(data?: Partial<MissionSetupConfig>): void {
    const fromRegistry = this.registry.get('missionConfig') as MissionSetupConfig | undefined;
    this.missionConfig = {
      ...DEFAULT_MISSION_CONFIG,
      ...(fromRegistry ?? {}),
      ...(data ?? {}),
    };
    this.aiAssistantEnabled = this.missionConfig.aiAssistant;
    this.missionStartAt = this.time.now;

    if (this.missionConfig.mode === 'pressure') {
      this.objectiveNeed = 4;
      this.reinforceAt = 13000;
    } else {
      this.objectiveNeed = 3;
      this.reinforceAt = 17000;
    }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createModelTextures();
    this.drawMap();
    this.spawnPlayer();
    this.createObstacleColliders();
    this.spawnEnemies();
    if (this.missionConfig.mode === 'pressure') {
      this.spawnEnemy(1480, 340);
      this.spawnEnemy(1620, 760);
    }
    this.spawnLootContainers();
    this.spawnNpcs();
    this.createExtractionZones();
    this.createUi();
    this.setupCameraAndAtmosphere();
    this.setupInput();
    this.setupCombatOverlap();
    this.playStoryIntro();
  }

  private createModelTextures(): void {
    if (this.textures.exists('player_model')) return;
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0x1b3036, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xb9d7c7, 1).fillRoundedRect(10, 8, 12, 16, 4);
    g.fillStyle(0x40565f, 1).fillRect(8, 15, 16, 3);
    g.fillStyle(0xead4aa, 1).fillCircle(16, 24, 3);
    g.generateTexture('player_model', 32, 32);

    g.clear();
    g.fillStyle(0x3f1817, 1).fillCircle(14, 14, 12);
    g.fillStyle(0x8d3e38, 1).fillCircle(14, 14, 8);
    g.fillStyle(0x251111, 1).fillTriangle(6, 6, 10, 2, 12, 8);
    g.fillStyle(0x251111, 1).fillTriangle(22, 6, 18, 2, 16, 8);
    g.fillStyle(0xf4d177, 1).fillRect(10, 11, 2, 2);
    g.fillStyle(0xf4d177, 1).fillRect(16, 11, 2, 2);
    g.fillStyle(0xc57452, 1).fillRect(11, 18, 6, 3);
    g.generateTexture('enemy_model', 28, 28);

    g.clear();
    g.fillStyle(0x4b4e44, 1).fillRoundedRect(3, 5, 26, 22, 4);
    g.fillStyle(0x616659, 1).fillRect(5, 10, 22, 3);
    g.fillStyle(0x383b33, 1).fillRect(5, 16, 22, 3);
    g.generateTexture('crate_model', 32, 32);

    g.clear();
    g.fillStyle(0x727a80, 1).fillRoundedRect(2, 6, 34, 24, 8);
    g.fillStyle(0x5a6168, 1).fillCircle(10, 12, 6);
    g.fillStyle(0x8a9298, 1).fillCircle(24, 14, 7);
    g.fillStyle(0x4b5359, 1).fillRoundedRect(7, 18, 20, 8, 4);
    g.generateTexture('rock_model', 38, 34);

    g.clear();
    g.fillStyle(0x7f613f, 1).fillRect(0, 10, 54, 14);
    g.fillStyle(0x9f7b4f, 1).fillRect(2, 8, 50, 4);
    g.fillStyle(0x5e472f, 1).fillRect(6, 12, 42, 2);
    g.generateTexture('ramp_model', 54, 26);

    g.clear();
    g.fillStyle(0x56753f, 1).fillTriangle(12, 2, 2, 22, 22, 22);
    g.fillStyle(0x6c9250, 1).fillTriangle(12, 6, 5, 20, 19, 20);
    g.fillStyle(0x5f4a2f, 1).fillRect(10, 22, 4, 8);
    g.generateTexture('pine_model', 24, 30);

    g.clear();
    g.fillStyle(0x5e7f53, 1).fillCircle(12, 10, 9);
    g.fillStyle(0x789c69, 1).fillCircle(15, 12, 7);
    g.fillStyle(0x556f4a, 1).fillEllipse(12, 20, 18, 8);
    g.generateTexture('bush_model', 26, 26);

    g.clear();
    g.fillStyle(0x8f6a46, 1).fillRect(2, 2, 42, 30);
    g.fillStyle(0xb08459, 1).fillRect(2, 2, 42, 6);
    g.fillStyle(0x6e5034, 1).fillRect(6, 10, 34, 2);
    g.fillStyle(0x6e5034, 1).fillRect(6, 16, 34, 2);
    g.fillStyle(0x6e5034, 1).fillRect(6, 22, 34, 2);
    g.generateTexture('container_yellow', 46, 34);

    g.clear();
    g.fillStyle(0x6f3a32, 1).fillRect(2, 2, 42, 30);
    g.fillStyle(0x8f4a3f, 1).fillRect(2, 2, 42, 6);
    g.fillStyle(0x512620, 1).fillRect(6, 10, 34, 2);
    g.fillStyle(0x512620, 1).fillRect(6, 16, 34, 2);
    g.fillStyle(0x512620, 1).fillRect(6, 22, 34, 2);
    g.generateTexture('container_red', 46, 34);

    g.clear();
    g.fillStyle(0x6f5e46, 1).fillRect(14, 8, 8, 42);
    g.fillStyle(0x7f6d54, 1).fillRect(6, 8, 24, 4);
    g.fillStyle(0x97a8ad, 1).fillRect(8, 2, 20, 8);
    g.fillStyle(0x5d4e3a, 1).fillRect(10, 18, 16, 2);
    g.fillStyle(0x5d4e3a, 1).fillRect(10, 26, 16, 2);
    g.fillStyle(0x5d4e3a, 1).fillRect(10, 34, 16, 2);
    g.generateTexture('tower_model', 36, 54);

    g.clear();
    g.fillStyle(0x7f9156, 1).fillRoundedRect(2, 4, 20, 14, 3);
    g.fillStyle(0x4e5e35, 1).fillRect(4, 7, 16, 2);
    g.generateTexture('food_model', 24, 24);

    g.clear();
    g.fillStyle(0x5d7f6a, 1).fillRoundedRect(2, 3, 20, 16, 2);
    g.fillStyle(0xc4d4c8, 1).fillRect(10, 5, 4, 12);
    g.fillStyle(0xc4d4c8, 1).fillRect(6, 9, 12, 4);
    g.generateTexture('med_model', 24, 24);

    g.clear();
    g.fillStyle(0x7a7f87, 1).fillRoundedRect(3, 4, 18, 14, 2);
    g.fillStyle(0x4a4f57, 1).fillRect(5, 8, 14, 2);
    g.fillStyle(0x4a4f57, 1).fillRect(5, 12, 14, 2);
    g.generateTexture('part_model', 24, 24);

    g.clear();
    g.fillStyle(0xd9d3b1, 1).fillCircle(4, 4, 3);
    g.generateTexture('bullet_model', 8, 8);

    g.clear();
    g.fillStyle(0x6a3f34, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xd9c18f, 1).fillCircle(16, 10, 5);
    g.fillStyle(0x9f6648, 1).fillRect(9, 15, 14, 11);
    g.fillStyle(0xb58f61, 1).fillRect(6, 24, 20, 4);
    g.generateTexture('npc_mulan', 32, 32);

    g.clear();
    g.fillStyle(0x2c4f6a, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xd6c39e, 1).fillCircle(16, 10, 5);
    g.fillStyle(0x4b718c, 1).fillRect(9, 15, 14, 11);
    g.fillStyle(0x8cb4cf, 1).fillRect(6, 24, 20, 4);
    g.generateTexture('npc_kai', 32, 32);

    g.clear();
    g.fillStyle(0x4b3e75, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xd6bfa0, 1).fillCircle(16, 10, 5);
    g.fillStyle(0x695b96, 1).fillRect(9, 15, 14, 11);
    g.fillStyle(0x9f93c4, 1).fillRect(6, 24, 20, 4);
    g.generateTexture('npc_xuance', 32, 32);

    g.destroy();
  }

  private drawMap(): void {
    this.cameras.main.setBackgroundColor('#2a231a');
    if (this.textures.exists('official_desert_bg')) {
      this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'official_desert_bg').setDepth(0).setAlpha(0.4);
    }

    const g = this.add.graphics();
    g.fillStyle(0x3e3122, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    g.fillStyle(0x4d3a27, 1).fillRect(24, 24, WORLD_WIDTH - 48, WORLD_HEIGHT - 48);
    g.lineStyle(2, 0x6c5539, 0.85).strokeRect(24, 24, WORLD_WIDTH - 48, WORLD_HEIGHT - 48);

    g.fillStyle(0x5e472f, 0.75).fillEllipse(340, 230, 450, 220);
    g.fillStyle(0x5a442d, 0.78).fillEllipse(760, 680, 520, 260);
    g.fillStyle(0x63492e, 0.72).fillEllipse(1240, 280, 420, 220);
    g.fillStyle(0x654a2d, 0.74).fillEllipse(1640, 760, 460, 260);

    g.lineStyle(4, 0x7d5d3c, 0.95);
    g.beginPath();
    g.moveTo(GREAT_WALL_POINTS[0].x, GREAT_WALL_POINTS[0].y);
    GREAT_WALL_POINTS.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();

    for (let i = 0; i < GREAT_WALL_POINTS.length - 1; i += 1) {
      const from = GREAT_WALL_POINTS[i];
      const to = GREAT_WALL_POINTS[i + 1];
      const segLen = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const count = Math.floor(segLen / 34);
      for (let j = 0; j <= count; j += 1) {
        const t = count === 0 ? 0 : j / count;
        const x = Phaser.Math.Linear(from.x, to.x, t);
        const y = Phaser.Math.Linear(from.y, to.y, t);
        this.add.ellipse(x, y + 16, 30, 10, 0x000000, 0.24).setDepth(1);
        this.add.image(x, y, 'rock_model').setDepth(4);
      }
    }

    const pines = [
      { x: 420, y: 360 }, { x: 500, y: 320 }, { x: 580, y: 298 },
      { x: 990, y: 230 }, { x: 1080, y: 210 }, { x: 1180, y: 210 },
      { x: 1450, y: 520 }, { x: 1540, y: 540 }, { x: 1620, y: 562 }, { x: 1740, y: 590 },
    ];
    pines.forEach((p) => {
      this.add.ellipse(p.x, p.y + 12, 20, 7, 0x000000, 0.22).setDepth(2);
      this.add.image(p.x, p.y, 'pine_model').setDepth(5);
    });

    const bushes = [
      { x: 640, y: 820 }, { x: 710, y: 860 }, { x: 790, y: 840 }, { x: 920, y: 780 },
      { x: 1330, y: 420 }, { x: 1400, y: 440 }, { x: 1260, y: 760 }, { x: 1150, y: 820 },
      { x: 1700, y: 880 }, { x: 1800, y: 930 },
    ];
    bushes.forEach((p) => {
      this.add.ellipse(p.x, p.y + 9, 18, 6, 0x000000, 0.2).setDepth(2);
      this.add.image(p.x, p.y, 'bush_model').setDepth(5);
    });

    const containers = [
      { x: 1180, y: 720, key: 'container_yellow' },
      { x: 1230, y: 720, key: 'container_red' },
      { x: 1280, y: 720, key: 'container_yellow' },
      { x: 1334, y: 719, key: 'container_red' },
      { x: 1500, y: 860, key: 'container_yellow' },
      { x: 1580, y: 860, key: 'container_red' },
      { x: 1660, y: 860, key: 'container_yellow' },
    ];
    containers.forEach((p) => {
      this.add.ellipse(p.x, p.y + 16, 32, 9, 0x000000, 0.24).setDepth(2);
      this.add.image(p.x, p.y, p.key).setDepth(5);
    });

    this.add.image(760, 660, 'ramp_model').setDepth(5).setRotation(-0.3).setScale(1.2, 1.1);
    this.add.image(1380, 360, 'tower_model').setDepth(6).setScale(1.1);
    this.add.image(1540, 372, 'tower_model').setDepth(6).setScale(0.98);

    this.add.rectangle(290, 934, 520, 258, 0x1b3a33, 0.17).setStrokeStyle(2, 0x6bb09f, 0.55).setDepth(3);
    this.add.text(136, 802, '长城内城安全区\n魔种不会在此刷新', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#8ed8c0',
      lineSpacing: 5,
    }).setDepth(8);
  }

  private createObstacleColliders(): void {
    const blocks = [
      { x: 280, y: 910, w: 520, h: 24 },
      { x: 420, y: 828, w: 420, h: 22 },
      { x: 650, y: 740, w: 360, h: 22 },
      { x: 930, y: 640, w: 380, h: 22 },
      { x: 1210, y: 520, w: 360, h: 22 },
      { x: 1550, y: 438, w: 460, h: 22 },
      { x: 1500, y: 720, w: 250, h: 70 },
      { x: 1590, y: 860, w: 300, h: 72 },
    ];

    this.obstacleZones.forEach((zone) => zone.destroy());
    this.obstacleZones = [];

    blocks.forEach((b) => {
      const zone = this.add.zone(b.x, b.y, b.w, b.h);
      this.physics.add.existing(zone, true);
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(b.w, b.h);
      body.updateFromGameObject();
      this.obstacleZones.push(zone);
      this.physics.add.collider(this.player, zone);
      this.physics.add.collider(this.enemyGroup, zone);
    });
  }

  private setupCameraAndAtmosphere(): void {
    this.cameras.main.setZoom(1.04);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, 0, 20);

    this.atmosphereFog = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x7f5d32, 0.09)
      .setScrollFactor(0)
      .setDepth(520);

    this.atmosphereVignette = this.add.graphics().setScrollFactor(0).setDepth(530);
    this.atmosphereVignette.fillStyle(0x000000, 0.22);
    this.atmosphereVignette.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.atmosphereVignette.fillStyle(0x000000, 0);
    this.atmosphereVignette.fillCircle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 310);

    const sunGlow = this.add.ellipse(220, 120, 360, 200, 0xffd79b, 0.12)
      .setScrollFactor(0)
      .setDepth(521);
    this.tweens.add({
      targets: [sunGlow, this.atmosphereFog],
      alpha: { from: 0.08, to: 0.14 },
      duration: 3600,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  private spawnPlayer(): void {
    this.playerShadow = this.add.ellipse(220, 880, 16, 8, 0x000000, 0.35).setDepth(2);
    const useStateSprite = this.textures.exists('shouyue_state_idle');
    const playerKey = useStateSprite ? 'shouyue_state_idle' : (this.textures.exists('official_shouyue') ? 'official_shouyue' : 'player_model');
    this.player = this.physics.add.sprite(220, 866, playerKey).setDepth(6);
    if (useStateSprite) {
      this.player.setDisplaySize(54, 82);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setSize(20, 16);
      body.setOffset(18, 60);
    } else {
      this.player.setDisplaySize(36, 36);
    }
    this.player.setCollideWorldBounds(true);
    this.enemyGroup = this.physics.add.group();
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 80,
      runChildUpdate: false,
    });
  }

  private spawnEnemies(): void {
    const points = [
      { x: 720, y: 520 }, { x: 920, y: 430 }, { x: 1160, y: 332 }, { x: 1340, y: 396 },
      { x: 1450, y: 586 }, { x: 1720, y: 760 }, { x: 1260, y: 836 }, { x: 1680, y: 540 },
    ];
    points.forEach((p) => this.spawnEnemy(p.x, p.y));
  }

  private spawnEnemy(x: number, y: number): void {
    if (this.isInsideInnerWall(x, y)) return;
    const shadow = this.add.ellipse(x, y + 12, 18, 8, 0x000000, 0.28).setDepth(2);
    const enemyKey = this.textures.exists('official_mozhong') ? 'official_mozhong' : 'enemy_model';
    const sprite = this.physics.add.sprite(x, y, enemyKey).setDisplaySize(30, 30).setDepth(6);
    sprite.setCollideWorldBounds(true);
    this.enemyGroup.add(sprite);
    this.enemies.push({
      sprite,
      shadow,
      hp: 100,
      wanderDir: new Phaser.Math.Vector2(Phaser.Math.Between(-1, 1) || 1, Phaser.Math.Between(-1, 1) || -1).normalize(),
      lastAttackAt: 0,
    });
  }

  private spawnLootContainers(): void {
    const positions = [
      { x: 560, y: 690 },
      { x: 880, y: 620 },
      { x: 1120, y: 500 },
      { x: 1420, y: 650 },
      { x: 1650, y: 820 },
    ];
    this.lootContainers = positions.map((p, idx) => {
      const shadow = this.add.ellipse(p.x, p.y + 13, 24, 9, 0x000000, 0.25).setDepth(2);
      const boxKey = this.textures.exists('official_supply_box') ? 'official_supply_box' : 'crate_model';
      const sprite = this.add.sprite(p.x, p.y, boxKey).setDepth(5).setTint(0x8e8f7d);
      return {
        sprite,
        shadow,
        title: `长城外补给点-${idx + 1}`,
        opened: false,
        items: this.generateLootByIndex(idx),
      };
    });
  }

  private spawnNpcs(): void {
    const points: Array<{ x: number; y: number; key: string; name: string; role: string; line: string }> = [
      {
        x: 210,
        y: 820,
        key: this.textures.exists('official_npc_mulan') ? 'official_npc_mulan' : 'npc_mulan',
        name: '花木兰',
        role: '长城守卫军指挥',
        line: '优先带回粮草与医疗补给，守约，保持隐蔽推进。',
      },
      {
        x: 280,
        y: 848,
        key: this.textures.exists('official_npc_kai') ? 'official_npc_kai' : 'npc_kai',
        name: '铠',
        role: '近战支援',
        line: '右侧荒漠岩坡有魔种巡游，建议先走低噪路径。',
      },
      {
        x: 350,
        y: 876,
        key: this.textures.exists('official_npc_xuance') ? 'official_npc_xuance' : 'npc_xuance',
        name: '百里玄策',
        role: '侦查联络',
        line: '我会标记高价值物资点，你负责远程清障和撤离。',
      },
    ];

    this.npcs = points.map((it) => {
      const shadow = this.add.ellipse(it.x, it.y + 12, 18, 8, 0x000000, 0.27).setDepth(2);
      const sprite = this.add.sprite(it.x, it.y, it.key).setDisplaySize(30, 30).setDepth(7);
      this.add.text(it.x, it.y - 26, it.name, {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: '13px',
        color: '#f2e7cd',
      }).setDepth(20).setOrigin(0.5);
      return {
        sprite,
        shadow,
        name: it.name,
        role: it.role,
        line: it.line,
      };
    });
  }

  private generateLootByIndex(index: number): ItemStack[] {
    if (index === 0) return [{ id: 'food', label: '长城军粮箱', kind: 'material', count: 1 }, { id: 'sniper_ammo', label: '狙击专用弹', kind: 'ammo', count: 5 }];
    if (index === 1) return [{ id: 'med', label: '守城医疗包', kind: 'medical', count: 1 }];
    if (index === 2) return [{ id: 'part', label: '烽火机括零件', kind: 'material', count: 1 }, { id: 'sniper_ammo', label: '狙击专用弹', kind: 'ammo', count: 3 }];
    if (index === 3) return [{ id: 'part', label: '烽火机括零件', kind: 'material', count: 1 }, { id: 'food', label: '长城军粮箱', kind: 'material', count: 1 }];
    return [{ id: 'med', label: '守城医疗包', kind: 'medical', count: 1 }, { id: 'sniper_ammo', label: '狙击专用弹', kind: 'ammo', count: 2 }];
  }

  private createExtractionZones(): void {
    const zoneA = this.add.rectangle(1720, 180, 156, 86, 0x1f6d61, 0.32).setStrokeStyle(2, 0x7bc6b0).setDepth(3);
    const zoneB = this.add.rectangle(1760, 940, 156, 86, 0x1f6d61, 0.12).setStrokeStyle(2, 0x3f7f73).setDepth(3);
    this.extractionZones = [zoneA, zoneB];
    this.add.text(1650, 122, '撤离区 A', { fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#9adac6' }).setDepth(8);
    this.add.text(1690, 888, '撤离区 B', { fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', color: '#7e9f96' }).setDepth(8);
  }

  private createUi(): void {
    this.add.rectangle(250, 152, 468, 250, 0x0f181d, 0.86)
      .setStrokeStyle(2, 0x3a5660, 0.92)
      .setDepth(28)
      .setScrollFactor(0);
    this.add.rectangle(640, 642, 1240, 120, 0x0f171c, 0.74)
      .setStrokeStyle(2, 0x2d4a53, 0.86)
      .setDepth(28)
      .setScrollFactor(0);

    this.hudTop = this.add.text(24, 30, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#d7dfd2',
      lineSpacing: 6,
      wordWrap: { width: 440 },
    }).setDepth(30).setScrollFactor(0);

    this.hudRisk = this.add.text(24, 112, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#f0c67a',
      wordWrap: { width: 440 },
    }).setDepth(30).setScrollFactor(0);

    this.hudHint = this.add.text(24, 146, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '14px',
      color: '#9eb3a8',
      lineSpacing: 4,
      wordWrap: { width: 440 },
    }).setDepth(30).setScrollFactor(0);

    this.skillBoard = this.add.text(24, 220, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '15px',
      color: '#8fd3bf',
      lineSpacing: 5,
      wordWrap: { width: 440 },
    }).setDepth(30).setScrollFactor(0);

    this.banner = this.add.text(640, 44, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '22px',
      color: '#f4e4b6',
      backgroundColor: '#111c1f',
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    }).setOrigin(0.5).setDepth(50).setVisible(false).setScrollFactor(0);

    this.npcDialog = this.add.text(640, 566, '', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#f6ead8',
      backgroundColor: '#121f22',
      padding: { left: 14, right: 14, top: 10, bottom: 10 },
      lineSpacing: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(52).setVisible(false).setScrollFactor(0);

    this.createHotbar();
    this.createLootPanel();
    this.createCrosshair();
  }

  private createHotbar(): void {
    const baseX = 442;
    const y = 676;
    for (let i = 0; i < this.weaponSlots.length; i += 1) {
      const x = baseX + i * 140;
      const box = this.add.rectangle(x, y, 128, 64, 0x141f23, 0.92)
        .setStrokeStyle(2, 0x3c565f)
        .setDepth(40)
        .setScrollFactor(0);
      const label = this.add.text(x - 52, y - 20, '', {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: '16px',
        color: '#dbe5df',
      }).setDepth(41).setScrollFactor(0);
      const ammo = this.add.text(x - 52, y + 4, '', {
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '13px',
        color: '#aabeb4',
      }).setDepth(41).setScrollFactor(0);
      this.hotbarSlots.push({ box, label, ammo });
    }
  }

  private createLootPanel(): void {
    this.lootPanelBg = this.add.rectangle(640, 360, 1040, 520, 0x0f191c, 0.94)
      .setStrokeStyle(2, 0x3b5b56)
      .setDepth(60)
      .setScrollFactor(0)
      .setVisible(false);

    this.lootTitle = this.add.text(640, 120, '战利品管理', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      color: '#e7f0ea',
    }).setOrigin(0.5).setDepth(61).setScrollFactor(0).setVisible(false);

    this.invHeader = this.add.text(220, 170, '背包', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#c7dbd1',
    }).setDepth(61).setScrollFactor(0).setVisible(false);

    this.boxHeader = this.add.text(760, 170, '容器', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#c7dbd1',
    }).setDepth(61).setScrollFactor(0).setVisible(false);
  }

  private createCrosshair(): void {
    this.crosshair = this.add.graphics().setDepth(45).setScrollFactor(0);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    this.cursors = keyboard!.createCursorKeys();
    this.keys = keyboard!.addKeys('W,A,S,D,SHIFT,SPACE,Q,E,F,R,TAB') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', () => this.ensureAudioReady());
    this.input.keyboard?.on('keydown', () => this.ensureAudioReady());
  }

  private setupCombatOverlap(): void {
    this.physics.add.overlap(this.bullets, this.enemyGroup, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.Physics.Arcade.Image;
      const enemySprite = enemyObj as Phaser.Physics.Arcade.Sprite;
      const hitDamage = Number(bullet.getData('damage') ?? this.currentWeapon().damage);
      const impactX = bullet.x;
      const impactY = bullet.y;
      bullet.setActive(false).setVisible(false).setVelocity(0);
      const hit = this.enemies.find((e) => e.sprite === enemySprite);
      if (!hit) return;
      hit.hp -= hitDamage;

      const impactCore = this.add.circle(impactX, impactY, 10, 0xffd8a1, 0.85).setDepth(1250);
      this.tweens.add({
        targets: impactCore,
        radius: 26,
        alpha: 0,
        duration: 130,
        onComplete: () => impactCore.destroy(),
      });
      for (let i = 0; i < 6; i += 1) {
        const frag = this.add.circle(impactX, impactY, Phaser.Math.Between(2, 4), 0xffb067, 0.9).setDepth(1240);
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const spd = Phaser.Math.Between(34, 72);
        this.tweens.add({
          targets: frag,
          x: impactX + Math.cos(ang) * spd,
          y: impactY + Math.sin(ang) * spd,
          alpha: 0,
          duration: 170,
          onComplete: () => frag.destroy(),
        });
      }

      if (hit.hp <= 0) {
        this.dropEnemyLoot(hit.sprite.x, hit.sprite.y);
        hit.shadow.destroy();
        hit.sprite.destroy();
        this.enemies = this.enemies.filter((e) => e !== hit);
      }
    });
  }

  private ensureAudioReady(): void {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
  }

  private playSfx(type: 'shot' | 'scan' | 'snipe' | 'dash' | 'hurt'): void {
    this.ensureAudioReady();
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === 'shot') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    if (type === 'scan') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
      return;
    }

    if (type === 'snipe') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.18);
      return;
    }

    if (type === 'dash') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.16);
      return;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  private setPlayerVisualState(state: PlayerState, holdMs = 0, force = false): void {
    const now = this.time.now;
    const nextPriority = PLAYER_STATE_PRIORITY[state];
    if (!force && now < this.playerStateUntil && nextPriority < this.playerStateLockPriority) return;
    if (holdMs > 0) {
      this.playerStateUntil = now + holdMs;
      this.playerStateLockPriority = nextPriority;
    } else if (now >= this.playerStateUntil) {
      this.playerStateLockPriority = 0;
    }
    this.playerVisualState = state;
    const textureMap: Record<PlayerState, string> = {
      idle: 'shouyue_state_idle',
      walk: 'shouyue_state_walk',
      fire: 'shouyue_state_fire',
      hurt: 'shouyue_state_hurt',
    };
    const key = textureMap[state];
    if (this.textures.exists(key) && this.player.texture.key !== key) {
      this.player.setTexture(key);
    }
  }

  private playStoryIntro(): void {
    this.showNpcDialog('花木兰｜战术简讯\n守约，长城外东南补给点已失联，优先回收军粮与医疗资源。');
    this.time.delayedCall(4800, () => {
      this.showNpcDialog('百里玄策｜侦查回传\n发现魔种群在峡谷口巡游，我会持续回传危险区域。');
    });
    if (this.aiAssistantEnabled) {
      this.time.delayedCall(9200, () => {
        this.showNpcDialog('AI 教练\n建议先取近点补给，再沿岩壁推进至北侧撤离区。');
      });
    }
  }

  update(time: number, delta: number): void {
    if (this.resultShown) return;
    this.elapsedMs += delta;
    this.updatePressure(time);
    this.updateExtractionSwitch(time);
    this.handleSlotSwitch();
    this.handleSkills(time);
    this.handleReload(time);
    this.movePlayer(delta);
    this.updateEnemies();
    this.handleCombat(time);
    this.handleInteraction();
    this.updateExtraction(delta);
    this.updateUi();
    this.updateHotbar();
    this.updateCrosshair();
    this.updatePseudo3DDepth();
    this.checkWinLose();
  }

  private updatePressure(time: number): void {
    const enemyPressure = this.enemies.length * 3.2;
    const hpPressure = (100 - this.hp) * 0.35;
    const timePressure = (this.elapsedMs / 1000) * 1.1;
    this.pressure = Phaser.Math.Clamp(enemyPressure + hpPressure + timePressure, 0, 100);

    if (time >= this.reinforceAt && this.enemies.length < 14) {
      this.spawnEnemyAtEdge();
      this.reinforceAt += this.missionConfig.mode === 'pressure' ? 12000 : 17000;
      this.hudHint.setText('侦测到新增敌人，建议调整路线');
    }
  }

  private updateExtractionSwitch(time: number): void {
    if (time < this.extractionSwitchAt) return;
    this.activeExtractIndex = (this.activeExtractIndex + 1) % this.extractionZones.length;
    this.extractionSwitchAt += 30000;
    this.extractionProgress = 0;
    this.extractionZones.forEach((zone, idx) => {
      if (idx === this.activeExtractIndex) {
        zone.setFillStyle(0x1f6d61, 0.32).setStrokeStyle(2, 0x7bc6b0);
      } else {
        zone.setFillStyle(0x1f6d61, 0.12).setStrokeStyle(2, 0x3f7f73);
      }
    });
  }

  private movePlayer(delta: number): void {
    const lockInput = this.lootPanelOpen || this.banner.visible;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (lockInput) {
      body.setVelocity(0);
      return;
    }

    if (this.skillDashEndAt > this.time.now) {
      body.setVelocity(this.skillDashDir.x * 460, this.skillDashDir.y * 460);
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 14;
      return;
    }

    const baseSpeed = 165;
    const sprinting = this.keys.SHIFT.isDown && this.stamina > 6;
    const speed = sprinting ? 250 : baseSpeed;
    body.setVelocity(0);
    if (this.keys.W.isDown || this.cursors.up.isDown) body.setVelocityY(-speed);
    if (this.keys.S.isDown || this.cursors.down.isDown) body.setVelocityY(speed);
    if (this.keys.A.isDown || this.cursors.left.isDown) body.setVelocityX(-speed);
    if (this.keys.D.isDown || this.cursors.right.isDown) body.setVelocityX(speed);
    body.velocity.normalize().scale(speed);

    if (sprinting && body.velocity.lengthSq() > 0) this.stamina = Math.max(0, this.stamina - delta * 0.045);
    else this.stamina = Math.min(100, this.stamina + delta * 0.03);

    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y + 14;

    const pointer = this.input.activePointer;
    const aim = new Phaser.Math.Vector2(pointer.worldX - this.player.x, pointer.worldY - this.player.y);
    if (aim.lengthSq() > 0) {
      aim.normalize();
      this.aimDir.set(aim.x, aim.y);
    }
    this.player.setFlipX(this.aimDir.x < 0);

    if (this.time.now >= this.playerStateUntil) {
      this.playerStateLockPriority = 0;
      if (body.velocity.lengthSq() > 0) {
        this.setPlayerVisualState('walk');
      } else {
        this.setPlayerVisualState('idle');
      }
    }
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
      if (this.isInsideInnerWall(enemy.sprite.x, enemy.sprite.y)) {
        const wallY = this.getWallYAtX(enemy.sprite.x);
        enemy.sprite.y = wallY - 20;
        body.setVelocityY(-120);
      }
      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y);
      const dist = toPlayer.length();
      const aggroDistance = 220;

      if (dist < aggroDistance) {
        toPlayer.normalize();
        body.setVelocity(toPlayer.x * (96 + this.pressure * 0.45), toPlayer.y * (96 + this.pressure * 0.45));
      } else {
        enemy.wanderDir.rotate((Math.random() - 0.5) * 0.02).normalize();
        body.setVelocity(enemy.wanderDir.x * 46, enemy.wanderDir.y * 46);
      }

      if (dist < 28 && this.time.now - enemy.lastAttackAt > 650) {
        this.hp = Math.max(0, this.hp - (5 + Math.floor(this.pressure / 35)));
        enemy.lastAttackAt = this.time.now;
        this.setPlayerVisualState('hurt', 220);
        this.playSfx('hurt');
      }

      const marked = this.scoutEyes.some((eye) =>
        Phaser.Math.Distance.Between(eye.x, eye.y, enemy.sprite.x, enemy.sprite.y) < 180,
      );
      enemy.sprite.setTint(marked ? 0xffc38d : 0xffffff);

      enemy.shadow.x = enemy.sprite.x;
      enemy.shadow.y = enemy.sprite.y + 12;
      enemy.sprite.x = Phaser.Math.Clamp(enemy.sprite.x, 22, WORLD_WIDTH - 22);
      enemy.sprite.y = Phaser.Math.Clamp(enemy.sprite.y, 22, WORLD_HEIGHT - 22);
    }
  }

  private handleCombat(time: number): void {
    if (this.lootPanelOpen || this.banner.visible || this.reloadFinishAt > time) return;
    const pointer = this.input.activePointer;
    const weapon = this.currentWeapon();
    const pointerDown = pointer.leftButtonDown();

    const triggerPressed = weapon.auto ? pointerDown : (pointerDown && !this.pointerWasDown);
    this.pointerWasDown = pointerDown;
    if (!triggerPressed || time - this.lastFireAt < weapon.fireDelay) return;

    const currentMag = this.weaponMags[weapon.id];
    if (currentMag <= 0) {
      this.hudHint.setText('弹匣为空，按 R 换弹');
      return;
    }

    this.lastFireAt = time;
    this.weaponMags[weapon.id] = currentMag - 1;
    this.fireProjectile(weapon);
  }

  private fireProjectile(weapon: WeaponConfig): void {
    const pointer = this.input.activePointer;
    const bullet = this.bullets.get(this.player.x, this.player.y, 'bullet_model') as Phaser.Physics.Arcade.Image | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true).setDisplaySize(10, 10).setDepth(7);

    const dir = new Phaser.Math.Vector2(pointer.worldX - this.player.x, pointer.worldY - this.player.y).normalize();
    const spread = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-weapon.spreadDeg, weapon.spreadDeg));
    const rotated = dir.clone().rotate(spread);
    const charged = this.skillSnipeBuffShots > 0;
    const projectileSpeed = charged ? weapon.projectileSpeed * 1.2 : weapon.projectileSpeed;
    const bulletDamage = charged ? Math.floor(weapon.damage * 1.8) : weapon.damage;
    const bulletRange = charged ? SNIPE_ATTACK_RANGE : NORMAL_ATTACK_RANGE;
    const lifeMs = Math.floor((bulletRange / projectileSpeed) * 1000);
    bullet.setData('damage', bulletDamage);
    bullet.setVelocity(rotated.x * projectileSpeed, rotated.y * projectileSpeed);
    bullet.setData('range', bulletRange);
    if (charged) {
      this.skillSnipeBuffShots -= 1;
      bullet.setTint(0xffd38a);
      this.playSfx('snipe');
    } else {
      bullet.setTint(0xffffff);
      this.playSfx('shot');
    }
    this.setPlayerVisualState('fire', 140);

    const muzzle = this.add.circle(
      this.player.x + rotated.x * 14,
      this.player.y + rotated.y * 14,
      charged ? 9 : 6,
      0xffe6b8,
      0.9,
    ).setDepth(1200);
    this.tweens.add({
      targets: muzzle,
      alpha: 0,
      scaleX: 0.12,
      scaleY: 0.12,
      duration: charged ? 140 : 100,
      onComplete: () => muzzle.destroy(),
    });

    for (let i = 0; i < (charged ? 7 : 4); i += 1) {
      const spark = this.add.circle(
        this.player.x + rotated.x * 22,
        this.player.y + rotated.y * 22,
        Phaser.Math.Between(2, 4),
        charged ? 0xffbf63 : 0xffe7b8,
        0.95,
      ).setDepth(1190);
      this.tweens.add({
        targets: spark,
        x: spark.x + rotated.x * Phaser.Math.Between(24, 44) + Phaser.Math.Between(-8, 8),
        y: spark.y + rotated.y * Phaser.Math.Between(24, 44) + Phaser.Math.Between(-8, 8),
        alpha: 0,
        duration: charged ? 220 : 150,
        onComplete: () => spark.destroy(),
      });
    }

    this.time.delayedCall(lifeMs, () => {
      if (bullet.active) bullet.setActive(false).setVisible(false).setVelocity(0);
    });
  }

  private handleReload(time: number): void {
    const weapon = this.currentWeapon();
    if (this.reloadFinishAt > time) {
      if (this.reloadFinishAt - time < 30) {
        this.finishReload();
      }
      return;
    }
    if (!Phaser.Input.Keyboard.JustDown(this.keys.R)) return;
    const mag = this.weaponMags[weapon.id];
    if (mag >= weapon.magSize) return;
    const ammoType = weapon.ammoType;
    if (!ammoType || this.reserveAmmo[ammoType] <= 0) {
      this.hudHint.setText('备用弹药不足');
      return;
    }
    this.reloadFinishAt = time + weapon.reloadMs;
    this.hudHint.setText('换弹中...');
  }

  private finishReload(): void {
    const weapon = this.currentWeapon();
    if (!weapon.ammoType) {
      this.reloadFinishAt = 0;
      return;
    }
    const need = weapon.magSize - this.weaponMags[weapon.id];
    const reserve = this.reserveAmmo[weapon.ammoType];
    const load = Math.min(need, reserve);
    this.weaponMags[weapon.id] += load;
    this.reserveAmmo[weapon.ammoType] -= load;
    this.reloadFinishAt = 0;
  }

  private handleSlotSwitch(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.TAB) && this.time.now - this.lastBagToggleAt > 180) {
      this.lastBagToggleAt = this.time.now;
      this.lootPanelOpen = !this.lootPanelOpen;
      this.activeLoot = undefined;
      this.refreshLootPanel();
    }
  }

  private handleSkills(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q) && time >= this.skillScanReadyAt) {
      this.skillScanReadyAt = time + 18000;
      const ring = this.add.circle(this.player.x, this.player.y, 180, 0x83b8aa, 0.08).setDepth(20);
      ring.setStrokeStyle(2, 0x8fd3bf, 0.6);
      this.scoutEyes.push({ x: this.player.x, y: this.player.y, expireAt: time + 9000, ring });
      for (let i = 0; i < 2; i += 1) {
        const pulse = this.add.circle(this.player.x, this.player.y, 24, 0x8fd3bf, 0.12).setDepth(19);
        pulse.setStrokeStyle(2, 0x8fd3bf, 0.65);
        this.tweens.add({
          targets: pulse,
          radius: 185,
          alpha: 0,
          duration: 760 + i * 220,
          onComplete: () => pulse.destroy(),
        });
      }
      this.playSfx('scan');
      this.hudHint.setText('已部署静谧之眼：标记范围内魔种');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && time >= this.skillSnipeReadyAt) {
      this.skillSnipeReadyAt = time + 12000;
      this.skillSnipeBuffShots = 1;
      const glow = this.add.circle(this.player.x, this.player.y, 26, 0xffbf7a, 0.18).setDepth(16);
      glow.setStrokeStyle(2, 0xffd38a, 0.8);
      this.tweens.add({
        targets: glow,
        radius: 46,
        alpha: 0,
        duration: 420,
        onComplete: () => glow.destroy(),
      });
      this.playSfx('snipe');
      this.hudHint.setText('狂风之息就绪：下一发狙击强化');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time >= this.skillDashReadyAt) {
      this.skillDashReadyAt = time + 8000;
      this.skillDashEndAt = time + 180;
      this.skillDashDir.set(-this.aimDir.x, -this.aimDir.y);
      this.playSfx('dash');

      const dashWave = this.add.circle(this.player.x, this.player.y, 20, 0x9bd6ff, 0.15).setDepth(18);
      dashWave.setStrokeStyle(2, 0xaed8ff, 0.8);
      this.tweens.add({
        targets: dashWave,
        radius: 72,
        alpha: 0,
        duration: 260,
        onComplete: () => dashWave.destroy(),
      });

      const weapon = this.currentWeapon();
      if (this.weaponMags[weapon.id] > 0) {
        this.skillSnipeBuffShots = Math.max(this.skillSnipeBuffShots, 1);
        this.weaponMags[weapon.id] -= 1;
        this.fireProjectile(weapon);
      }
      this.hudHint.setText('逃脱已触发：后撤并反击');
    }

    this.scoutEyes = this.scoutEyes.filter((eye) => {
      if (time < eye.expireAt) return true;
      eye.ring.destroy();
      return false;
    });
  }

  private handleInteraction(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.F) || this.time.now - this.lastInteractAt < 180) return;
    this.lastInteractAt = this.time.now;

    const nearestNpc = this.npcs.find((npc) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y) < 70,
    );
    if (nearestNpc) {
      const tactical = this.getNpcTacticalHint();
      this.showNpcDialog(
        `${nearestNpc.name}｜${nearestNpc.role}\n${nearestNpc.line}\n${tactical}\n${this.aiAssistantEnabled ? 'AI教练接口位：可替换为腾讯元器实时返回内容' : '当前为离线剧情对话'}`,
      );
      this.hudHint.setText(`已与 ${nearestNpc.name} 对话`);
      return;
    }

    const nearest = this.lootContainers.find((box) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, box.sprite.x, box.sprite.y) < 52,
    );
    if (!nearest) {
      this.hudHint.setText('附近没有可交互目标（NPC / 物资箱）');
      return;
    }
    this.activeLoot = nearest;
    nearest.opened = true;
    this.lootPanelOpen = true;
    this.refreshLootPanel();
  }

  private getNpcTacticalHint(): string {
    if (this.objectiveCollected < this.objectiveNeed) {
      const remain = this.objectiveNeed - this.objectiveCollected;
      if (this.pressure >= 70) {
        return `战术提示：当前威胁高，优先绕开魔种，仍需回收 ${remain} 份核心物资。`;
      }
      return `任务推进：已回收 ${this.objectiveCollected}/${this.objectiveNeed}，建议继续搜集外城补给点。`;
    }
    const zoneName = this.activeExtractIndex === 0 ? 'A' : 'B';
    return `任务推进：核心物资达标，立即前往撤离区 ${zoneName} 并保持站位完成撤离。`;
  }

  private getNoviceGuideHint(): string | null {
    const elapsedSec = (this.time.now - this.missionStartAt) / 1000;
    if (elapsedSec > 90) return null;
    if (elapsedSec <= 20) {
      return '新手引导①：先靠近花木兰/铠/玄策并按 F，获取战术指引。';
    }
    if (elapsedSec <= 45) {
      return '新手引导②：优先搜近点物资箱，目标是先拿到第1份核心物资。';
    }
    if (elapsedSec <= 70) {
      return '新手引导③：Q 侦查环标记魔种，E 强化下一发狙击。';
    }
    return '新手引导④：压力升高时用 Space 后撤反击，避免被近身围攻。';
  }

  private showNpcDialog(content: string): void {
    this.npcDialog.setText(content).setVisible(true);
    this.npcDialogHideEvent?.remove(false);
    this.npcDialogHideEvent = this.time.delayedCall(4200, () => {
      this.npcDialog.setVisible(false);
    });
  }

  private updateExtraction(delta: number): void {
    if (this.objectiveCollected < this.objectiveNeed) {
      this.extractionProgress = 0;
      return;
    }
    const zone = this.extractionZones[this.activeExtractIndex];
    const inside = Phaser.Geom.Rectangle.Contains(zone.getBounds(), this.player.x, this.player.y);
    if (inside && !this.lootPanelOpen) this.extractionProgress += delta;
    else this.extractionProgress = 0;
  }

  private updateUi(): void {
    const zoneName = this.activeExtractIndex === 0 ? 'A' : 'B';
    const extractText = this.objectiveCollected < this.objectiveNeed
      ? `待收集 ${this.objectiveCollected}/${this.objectiveNeed}`
      : `可撤离 ${Math.max(0, (this.extractionNeedMs - this.extractionProgress) / 1000).toFixed(1)}s`;

    this.hudTop.setText(
      `生命 ${this.hp}   耐力 ${Math.floor(this.stamina)}   压力 ${Math.floor(this.pressure)}\n` +
      `敌人 ${this.enemies.length}   背包 ${this.itemCount()}/${this.inventoryCap}   目标 ${this.objectiveCollected}/${this.objectiveNeed}\n` +
      `模式 ${this.missionConfig.mode === 'pressure' ? '高压' : '标准'}   AI ${this.aiAssistantEnabled ? '开' : '关'}   撤离区 ${zoneName} · ${extractText}`,
    );

    const risk = this.pressure > 80 ? '极高' : this.pressure > 58 ? '高' : this.pressure > 32 ? '中' : '低';
    this.hudRisk.setText(`威胁等级：${risk}`);
    const guideHint = this.getNoviceGuideHint();

    if (this.lootPanelOpen && this.activeLoot) {
      this.hudHint.setText('战利品面板已开启：点击条目转移物资');
    } else if (this.reloadFinishAt > this.time.now) {
      this.hudHint.setText('换弹中...');
    } else if (this.objectiveCollected < this.objectiveNeed) {
      this.hudHint.setText(
        `${guideHint ? `${guideHint}\n` : ''}` +
        `操作：WASD移动  Shift冲刺  鼠标左键射击  F交互  R换弹  Tab背包\n` +
        `技能：Q侦查环  E强化射击  Space后撤反击\n` +
        `射程：普攻 ${NORMAL_ATTACK_RANGE} ｜ 强化 ${SNIPE_ATTACK_RANGE}`,
      );
    } else {
      this.hudHint.setText('核心物资达标，前往当前激活撤离区');
    }

    const cdQ = Math.max(0, Math.ceil((this.skillScanReadyAt - this.time.now) / 1000));
    const cdE = Math.max(0, Math.ceil((this.skillSnipeReadyAt - this.time.now) / 1000));
    const cdSpace = Math.max(0, Math.ceil((this.skillDashReadyAt - this.time.now) / 1000));
    const buff = this.skillSnipeBuffShots > 0 ? '狂风之息:已装填' : '狂风之息:待机';
    this.skillBoard.setText(
      `状态：${this.playerVisualState}   强化：${buff}\n` +
      `冷却：Q ${cdQ}s ｜ E ${cdE}s ｜ Space ${cdSpace}s`,
    );
  }

  private updateHotbar(): void {
    this.hotbarSlots.forEach((slotUi, idx) => {
      const weaponId = this.weaponSlots[idx];
      const weapon = WEAPON_CONFIG[weaponId];
      const selected = true;
      slotUi.box.setFillStyle(selected ? 0x2a4f56 : 0x141f23, selected ? 1 : 0.92);
      slotUi.box.setStrokeStyle(2, selected ? 0x7bc6b0 : 0x3c565f);
      slotUi.label.setText(`主武器 ${weapon.id}`);
      const mag = this.weaponMags[weapon.id];
      const reserve = weapon.ammoType ? this.reserveAmmo[weapon.ammoType] : 0;
      slotUi.ammo.setText(`${mag}/${reserve}`);
    });
  }

  private updateCrosshair(): void {
    const p = this.input.activePointer;
    this.crosshair.clear();
    const charged = this.skillSnipeBuffShots > 0;
    this.crosshair.lineStyle(2, charged ? 0xffd58b : 0xe9efe5, 0.95);
    this.crosshair.strokeCircle(p.x, p.y, 11);
    this.crosshair.lineBetween(p.x - 17, p.y, p.x - 6, p.y);
    this.crosshair.lineBetween(p.x + 6, p.y, p.x + 17, p.y);
    this.crosshair.lineBetween(p.x, p.y - 17, p.x, p.y - 6);
    this.crosshair.lineBetween(p.x, p.y + 6, p.x, p.y + 17);
  }

  private updatePseudo3DDepth(): void {
    this.player.setDepth(200 + this.player.y);
    this.playerShadow.setDepth(180 + this.player.y);

    this.enemies.forEach((enemy) => {
      enemy.sprite.setDepth(200 + enemy.sprite.y);
      enemy.shadow.setDepth(180 + enemy.sprite.y);
    });

    this.lootContainers.forEach((box) => {
      box.sprite.setDepth(170 + box.sprite.y);
      box.shadow.setDepth(160 + box.shadow.y);
    });

    this.npcs.forEach((npc) => {
      npc.sprite.setDepth(210 + npc.sprite.y);
      npc.shadow.setDepth(190 + npc.shadow.y);
    });
  }

  private refreshLootPanel(): void {
    const show = this.lootPanelOpen;
    this.lootPanelBg.setVisible(show);
    this.lootTitle.setVisible(show);
    this.invHeader.setVisible(show);
    this.boxHeader.setVisible(show);

    this.invList.forEach((t) => t.destroy());
    this.boxList.forEach((t) => t.destroy());
    this.invList = [];
    this.boxList = [];
    if (!show) return;
    this.lootTitle.setText(this.activeLoot ? `战利品管理 · ${this.activeLoot.title}` : '战利品管理');

    this.inventory.forEach((item, idx) => {
      const text = this.add.text(180, 210 + idx * 28, `${idx + 1}. ${item.label} x${item.count}`, {
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '16px',
        color: '#d6e1da',
      }).setDepth(62).setScrollFactor(0).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.moveInventoryToBox(idx));
      this.invList.push(text);
    });

    const boxItems = this.activeLoot?.items ?? [];
    boxItems.forEach((item, idx) => {
      const text = this.add.text(720, 210 + idx * 28, `${idx + 1}. ${item.label} x${item.count}`, {
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '16px',
        color: '#e2dcc9',
      }).setDepth(62).setScrollFactor(0).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.moveBoxToInventory(idx));
      this.boxList.push(text);
    });

    if (boxItems.length === 0) {
      this.boxList.push(
        this.add.text(720, 210, '容器已空', {
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '15px',
          color: '#8ea39a',
        }).setDepth(62).setScrollFactor(0),
      );
    }
  }

  private moveInventoryToBox(index: number): void {
    if (!this.activeLoot) return;
    const item = this.inventory[index];
    if (!item) return;
    this.inventory.splice(index, 1);
    this.pushItem(this.activeLoot.items, item);
    this.refreshLootPanel();
  }

  private moveBoxToInventory(index: number): void {
    if (!this.activeLoot) return;
    if (this.itemCount() >= this.inventoryCap) {
      this.hudHint.setText('背包容量不足');
      return;
    }
    const item = this.activeLoot.items[index];
    if (!item) return;
    this.activeLoot.items.splice(index, 1);
    this.pushItem(this.inventory, item);
    this.consumeObjective(item);
    this.applyAmmoPickup(item);
    this.refreshLootPanel();
  }

  private pushItem(container: ItemStack[], item: ItemStack): void {
    const found = container.find((it) => it.id === item.id);
    if (found) found.count += item.count;
    else container.push({ ...item });
  }

  private consumeObjective(item: ItemStack): void {
    if (item.label === '长城军粮箱' || item.label === '守城医疗包' || item.label === '烽火机括零件') {
      this.objectiveCollected = Math.min(this.objectiveNeed, this.objectiveCollected + 1);
    }
  }

  private applyAmmoPickup(item: ItemStack): void {
    if (item.id === 'sniper_ammo') this.reserveAmmo.sniper += item.count;
  }

  private itemCount(): number {
    return this.inventory.reduce((acc, it) => acc + it.count, 0);
  }

  private currentWeapon(): WeaponConfig {
    return WEAPON_CONFIG.狙击枪;
  }

  private getWallYAtX(x: number): number {
    if (x <= GREAT_WALL_POINTS[0].x) return GREAT_WALL_POINTS[0].y;
    if (x >= GREAT_WALL_POINTS[GREAT_WALL_POINTS.length - 1].x) return GREAT_WALL_POINTS[GREAT_WALL_POINTS.length - 1].y;
    for (let i = 0; i < GREAT_WALL_POINTS.length - 1; i += 1) {
      const from = GREAT_WALL_POINTS[i];
      const to = GREAT_WALL_POINTS[i + 1];
      if (x >= from.x && x <= to.x) {
        const t = (x - from.x) / (to.x - from.x);
        return Phaser.Math.Linear(from.y, to.y, t);
      }
    }
    return 620;
  }

  private isInsideInnerWall(x: number, y: number): boolean {
    if (x < GREAT_WALL_POINTS[0].x - 40 || x > GREAT_WALL_POINTS[GREAT_WALL_POINTS.length - 1].x + 40) return false;
    const wallY = this.getWallYAtX(x);
    return y > wallY + 16;
  }

  private spawnEnemyAtEdge(): void {
    for (let i = 0; i < 24; i += 1) {
      const edge = Phaser.Math.Between(0, 3);
      let x = 80;
      let y = 80;
      if (edge === 0) {
        x = Phaser.Math.Between(80, WORLD_WIDTH - 80);
        y = 80;
      } else if (edge === 1) {
        x = WORLD_WIDTH - 80;
        y = Phaser.Math.Between(80, WORLD_HEIGHT - 80);
      } else if (edge === 2) {
        x = Phaser.Math.Between(80, WORLD_WIDTH - 80);
        y = WORLD_HEIGHT - 80;
      } else {
        x = 80;
        y = Phaser.Math.Between(80, WORLD_HEIGHT - 80);
      }
      if (this.isInsideInnerWall(x, y)) continue;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 360) continue;
      this.spawnEnemy(x, y);
      return;
    }

    this.spawnEnemy(1440, 420);
  }

  private dropEnemyLoot(x: number, y: number): void {
    const shadow = this.add.ellipse(x, y + 10, 20, 8, 0x000000, 0.22).setDepth(2);
    const sprite = this.add.sprite(x, y, 'part_model').setDepth(6);
    const crate: LootContainer = {
      sprite,
      shadow,
      title: '魔种残骸',
      opened: false,
      items: [{ id: 'part', label: '烽火机括零件', kind: 'material', count: 1 }],
    };
    this.lootContainers.push(crate);
  }

  private checkWinLose(): void {
    if (this.hp <= 0) {
      this.showResult('训练失败：生命值耗尽');
      return;
    }
    if (this.objectiveCollected >= this.objectiveNeed && this.extractionProgress >= this.extractionNeedMs) {
      this.showResult('撤离成功：任务完成');
    }
  }

  private showResult(message: string): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.banner.setText(message).setVisible(true);
    this.time.delayedCall(2600, () => this.scene.start('MainMenuScene'));
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('missing #app container');
app.innerHTML = '';

new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  parent: 'app',
  backgroundColor: '#0d1418',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [MainMenuScene, TrainingRoomScene, BriefingScene, MissionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Math.min(window.devicePixelRatio || 1, 2),
  },
});
