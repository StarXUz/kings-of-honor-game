// @ts-nocheck
import Phaser from 'phaser';
import './style.css';
import { requestNpcDialogue } from './ai/client';
import { DialogueOverlay } from './ui/dialogueOverlay';
import {
  MAIN_MENU_COPY,
  STORY_INTRO_LINES,
  NPC_PROFILE_COPY,
  getBriefingLines,
  getMissionSuccessText,
  getModeLabel,
  getObjectiveNeed,
  getPreparationCopy,
  MISSION_FAILURE_TEXT,
} from './gameplay/story-copy';
import {
  SUPPLY_CACHE_LAYOUT,
  buildSupplyItems,
  getSupplyColor,
  getSupplyItem,
  getSupplyPrompt,
  getSupplyThemeText,
  isCriticalSupply,
} from './gameplay/supply-data';
import { NPC_PATROL_ROUTES } from './gameplay/environment-layout';

type ItemKind = 'food' | 'medical' | 'survival' | 'ordnance';
type WeaponId = '狙击枪';
type AmmoType = 'sniper';
type PlayerState = 'idle' | 'walk' | 'fire' | 'hurt';
type EnemyKind = 'grunt' | 'elite' | 'boss';

interface ItemStack {
  id: string;
  label: string;
  kind: ItemKind;
  count: number;
  critical?: boolean;
  tag?: string;
  icon?: string;
  accent?: string;
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
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  attackDamage: number;
  chaseRadius: number;
  wanderDir: Phaser.Math.Vector2;
  lastAttackAt: number;
  anchor: Phaser.Math.Vector2;
  nextRetargetAt: number;
  stealthUntil?: number;
  burstReadyAt?: number;
}

interface LootContainer {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  title: string;
  items: ItemStack[];
  opened: boolean;
  theme?: string;
  prompt?: string;
  hint?: string;
}

interface NpcUnit {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  name: string;
  role: string;
  line: string;
  persona: string;
  state: 'idle' | 'patrol' | 'guard' | 'observe' | 'support' | 'warn';
  speed: number;
  patrolRoute: Phaser.Math.Vector2[];
  patrolIndex: number;
  target: Phaser.Math.Vector2;
  stateUntil: number;
  talkCooldownUntil: number;
}

interface MissionSetupConfig {
  mode: 'standard' | 'pressure';
  aiAssistant: boolean;
}

interface ObstacleBlock {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_MISSION_CONFIG: MissionSetupConfig = {
  mode: 'standard',
  aiAssistant: true,
};

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 4200;
const WORLD_HEIGHT = 2600;
const NORMAL_ATTACK_RANGE = 420;
const SNIPE_ATTACK_RANGE = 1280;
const FORTRESS_LEFT = 220;
const FORTRESS_RIGHT = 1520;
const FORTRESS_TOP = 1660;
const FORTRESS_BOTTOM = 2380;
const GATE_X = 920;
const GATE_WIDTH = 220;
const GATE_INNER_DEPTH = 210;

const WEAPON_CONFIG: Record<WeaponId, WeaponConfig> = {
  狙击枪: {
    id: '狙击枪',
    damage: 280,
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
    const copy = MAIN_MENU_COPY;

    const g = this.add.graphics();
    g.fillStyle(0x0f1a1d, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x16262b, 1).fillRect(120, 80, 1040, 560);
    g.lineStyle(2, 0x2d4b52, 0.9).strokeRect(120, 80, 1040, 560);

    this.add.text(640, 174, copy.title, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '56px',
      color: '#d8e3d7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 246, copy.subtitle, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      color: '#9cbdb0',
    }).setOrigin(0.5);

    this.add.text(640, 332, copy.kicker, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '19px',
      color: '#b9c8bf',
    }).setOrigin(0.5);

    this.add.text(640, 366, copy.controls, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#8ea99f',
    }).setOrigin(0.5);

    const enterBtn = this.add.rectangle(640, 462, 380, 74, 0x284b4f, 0.96)
      .setStrokeStyle(2, 0x73b4a1)
      .setInteractive({ useHandCursor: true });
    const enterTxt = this.add.text(640, 462, '进入任务准备', {
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
    this.add.text(640, 544, '查看围城前情', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#cde4db',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const storyPanelBg = this.add.rectangle(640, 360, 920, 440, 0x0f171b, 0.96)
      .setStrokeStyle(2, 0x567b83)
      .setVisible(false);
    const storyPanelText = this.add.text(640, 330, copy.storyPanel, {
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
    const copy = getPreparationCopy(this.aiAssistant);
    const g = this.add.graphics();
    g.fillStyle(0x0d171b, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x142126, 1).fillRect(80, 68, 1120, 584);
    g.lineStyle(2, 0x2f4a52, 0.95).strokeRect(80, 68, 1120, 584);
    g.fillStyle(0x0b1418, 1).fillRoundedRect(118, 124, 1044, 482, 12);

    this.add.text(640, 112, copy.title, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '42px',
      color: '#dbe8de',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 156, copy.subtitle, {
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

    this.add.text(410, 236, copy.standardTitle, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '30px',
      color: '#dcece6',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(410, 292, copy.standardBodyTitle, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '15px',
      color: '#9bc7bb',
    }).setOrigin(0.5);
    this.add.text(410, 318, copy.standardBody, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '14px',
      color: '#9bc7bb',
    }).setOrigin(0.5);

    this.add.text(870, 236, copy.pressureTitle, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '30px',
      color: '#f2dcc4',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(870, 292, copy.pressureBodyTitle, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '15px',
      color: '#e0bf98',
    }).setOrigin(0.5);
    this.add.text(870, 318, copy.pressureBody, {
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
      aiText.setText(
        this.aiAssistant
          ? '腾讯混元角色对话：已开启'
          : '腾讯混元角色对话：已关闭（本局不会启用角色聊天）',
      );
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
    this.add.text(430, 548, copy.back, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '26px',
      color: '#d4e0e4',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const nextBtn = this.add.rectangle(850, 548, 310, 64, 0x274e4f, 0.96)
      .setStrokeStyle(2, 0x77b5a6)
      .setInteractive({ useHandCursor: true });
    this.add.text(850, 548, copy.next, {
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

    this.add.text(640, 112, '出城前简报', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '44px',
      color: '#f1d6bc',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(640, 160, `行动规格：${getModeLabel(cfg.mode)} ｜ 战场 AI：${cfg.aiAssistant ? '开启' : '关闭'}`, {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '16px',
      color: '#d2b39d',
    }).setOrigin(0.5);

    const lines = getBriefingLines(cfg.mode, cfg.aiAssistant);

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
    this.add.text(426, 598, '返回任务准备', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '26px',
      color: '#f1dde0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const startBtn = this.add.rectangle(854, 598, 340, 64, 0x5a3a2a, 0.97)
      .setStrokeStyle(2, 0xc4936c)
      .setInteractive({ useHandCursor: true });
    this.add.text(854, 598, '开始补给行动（Enter）', {
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
  private skillSnipeActiveUntil = 0;
  private playerVisualState: PlayerState = 'idle';
  private playerStateUntil = 0;
  private playerStateLockPriority = 0;
  private audioCtx?: AudioContext;
  private sfxVariantIndex: Record<string, number> = {};

  private inventory: ItemStack[] = [
    { ...getSupplyItem('bandage_roll'), count: 1 },
  ];
  private inventoryCap = 10;
  private activeLoot?: LootContainer;
  private lootPanelOpen = false;

  private objectiveCollected = 0;
  private objectiveNeed = 3;
  private suppliesDelivered = false;
  private missionConfig: MissionSetupConfig = { ...DEFAULT_MISSION_CONFIG };
  private aiAssistantEnabled = true;

  private hudTop!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudRisk!: Phaser.GameObjects.Text;
  private skillBoard!: Phaser.GameObjects.Text;
  private npcDialog!: Phaser.GameObjects.Text;
  private npcDialogHideEvent?: Phaser.Time.TimerEvent;
  private banner!: Phaser.GameObjects.Text;
  private bannerHideEvent?: Phaser.Time.TimerEvent;
  private dialogueOverlay?: DialogueOverlay;
  private activeDialogueNpc?: NpcUnit;
  private dialogueHistory: Array<{ speaker: string; content: string }> = [];
  private readonly npcDialogueMemory = new Map<string, Array<{ speaker: string; content: string }>>();
  private hudCollapsed = false;
  private hudDecor: Phaser.GameObjects.Rectangle[] = [];
  private hudDetailItems: Phaser.GameObjects.Text[] = [];
  private hudToggleButton!: Phaser.GameObjects.Container;
  private hudToggleLabel!: Phaser.GameObjects.Text;
  private interactionRing!: Phaser.GameObjects.Ellipse;
  private interactionWorldHint!: Phaser.GameObjects.Text;
  private activeInteractionTarget?: { type: 'npc' | 'loot'; ref: NpcUnit | LootContainer };

  private hotbarSlots: Array<{ box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; ammo: Phaser.GameObjects.Text }> = [];

  private lootPanelBg!: Phaser.GameObjects.Rectangle;
  private lootTitle!: Phaser.GameObjects.Text;
  private invHeader!: Phaser.GameObjects.Text;
  private boxHeader!: Phaser.GameObjects.Text;
  private invList: Phaser.GameObjects.Text[] = [];
  private boxList: Phaser.GameObjects.Text[] = [];
  private atmosphereVignette!: Phaser.GameObjects.Graphics;
  private atmosphereFog!: Phaser.GameObjects.Rectangle;
  private fogLayer!: Phaser.GameObjects.RenderTexture;
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('MissionScene');
  }

  preload(): void {
    this.load.setCORS('anonymous');
    this.load.image('phaser_crate32', 'https://cdn.phaserfiles.com/v385/assets/sprites/crate32.png');
    this.load.image('phaser_mushroom', 'https://cdn.phaserfiles.com/v385/assets/sprites/mushroom2.png');
    this.load.image('phaser_palm', 'https://cdn.phaserfiles.com/v385/assets/sprites/palm-tree-left.png');
    this.load.image('phaser_platform', 'https://cdn.phaserfiles.com/v385/assets/sprites/platform.png');
    this.load.image('official_shouyue', '/assets/official/shouyue.png');
    this.load.image('official_mozhong', '/assets/official/mozhong.png');
    this.load.image('official_supply_box', '/assets/official/supply_box.png');
    this.load.image('official_npc_mulan', '/assets/official/npc_mulan_new.jpg');
    this.load.image('official_npc_kai', '/assets/official/npc_kai.png');
    this.load.image('official_npc_xuance', '/assets/official/npc_xuance.png');
    this.load.image('official_desert_bg', '/assets/official/desert_bg.png');
    this.load.image('shouyue_state_idle', '/assets/custom/shouyue_walk.png');
    this.load.image('shouyue_state_walk', '/assets/custom/shouyue_walk.png');
    this.load.image('shouyue_state_fire', '/assets/custom/shouyue_fire_alt.png');
    this.load.image('shouyue_state_hurt', '/assets/custom/shouyue_hurt.png');
    this.load.audio('sfx_shouyue_basic_a', '/assets/audio/shouyue_basic_a.wav');
    this.load.audio('sfx_shouyue_basic_b', '/assets/audio/shouyue_basic_b.wav');
    this.load.audio('sfx_shouyue_snipe_charge_a', '/assets/audio/shouyue_snipe_charge_a.wav');
    this.load.audio('sfx_shouyue_snipe_charge_b', '/assets/audio/shouyue_snipe_charge_b.wav');
    this.load.audio('sfx_shouyue_snipe_fire_a', '/assets/audio/shouyue_snipe_fire_a.wav');
    this.load.audio('sfx_shouyue_snipe_fire_b', '/assets/audio/shouyue_snipe_fire_b.wav');
  }

  create(data?: Partial<MissionSetupConfig>): void {
    const fromRegistry = this.registry.get('missionConfig') as MissionSetupConfig | undefined;
    this.missionConfig = {
      ...DEFAULT_MISSION_CONFIG,
      ...(fromRegistry ?? {}),
      ...(data ?? {}),
    };
    this.resetMissionRuntimeState();
    this.aiAssistantEnabled = this.missionConfig.aiAssistant;
    this.missionStartAt = this.time.now;

    this.objectiveNeed = getObjectiveNeed(this.missionConfig.mode);
    this.reinforceAt = this.missionConfig.mode === 'pressure' ? 9000 : 12000;

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
    this.createUi();
    this.setupCameraAndAtmosphere();
    this.setupInput();
    this.setupCombatOverlap();
    this.playStoryIntro();
  }

  private resetMissionRuntimeState(): void {
    this.hp = 100;
    this.stamina = 100;
    this.pressure = 0;
    this.elapsedMs = 0;
    this.lastFireAt = 0;
    this.reloadFinishAt = 0;
    this.lastInteractAt = 0;
    this.lastBagToggleAt = 0;
    this.pointerWasDown = false;
    this.resultShown = false;
    this.skillScanReadyAt = 0;
    this.skillSnipeReadyAt = 0;
    this.skillDashReadyAt = 0;
    this.skillDashEndAt = 0;
    this.skillSnipeActiveUntil = 0;
    this.playerVisualState = 'idle';
    this.playerStateUntil = 0;
    this.playerStateLockPriority = 0;
    this.weaponMags = { 狙击枪: WEAPON_CONFIG.狙击枪.magSize };
    this.reserveAmmo = { sniper: 24 };
    this.inventory = [{ ...getSupplyItem('bandage_roll'), count: 1 }];
    this.activeLoot = undefined;
    this.lootPanelOpen = false;
    this.objectiveCollected = 0;
    this.suppliesDelivered = false;
    this.activeDialogueNpc = undefined;
    this.dialogueHistory = [];
    this.npcDialogueMemory.clear();
    this.activeInteractionTarget = undefined;
    this.sfxVariantIndex = {};
    this.hudCollapsed = false;
    this.enemies = [];
    this.lootContainers = [];
    this.npcs = [];
    this.obstacleZones = [];
    this.hudDecor = [];
    this.hudDetailItems = [];
    this.hotbarSlots = [];
    this.invList = [];
    this.boxList = [];
    this.scoutEyes.forEach((eye) => eye.ring.destroy());
    this.scoutEyes = [];
    this.npcDialogHideEvent?.remove(false);
    this.bannerHideEvent?.remove(false);
    this.dialogueOverlay?.hide();
    this.dialogueOverlay?.clear();
  }

  private createModelTextures(): void {
    if (this.textures.exists('player_model') && this.textures.exists('enemy_boss_model')) return;
    const g = this.add.graphics();

    g.clear();
    g.fillStyle(0x1b3036, 1).fillCircle(16, 16, 14);
    g.fillStyle(0xb9d7c7, 1).fillRoundedRect(10, 8, 12, 16, 4);
    g.fillStyle(0x40565f, 1).fillRect(8, 15, 16, 3);
    g.fillStyle(0xead4aa, 1).fillCircle(16, 24, 3);
    g.generateTexture('player_model', 32, 32);

    g.clear();
    g.fillStyle(0x210d11, 0.95).fillEllipse(18, 21, 26, 28);
    g.fillStyle(0x48151c, 1).fillEllipse(18, 20, 18, 20);
    g.fillStyle(0x7f262d, 1).fillEllipse(18, 18, 12, 10);
    g.fillStyle(0x140507, 1).fillTriangle(5, 13, 10, 2, 14, 13);
    g.fillStyle(0x140507, 1).fillTriangle(31, 13, 26, 2, 22, 13);
    g.fillStyle(0x3b0f14, 1).fillTriangle(6, 27, 1, 18, 12, 22);
    g.fillStyle(0x3b0f14, 1).fillTriangle(30, 27, 35, 18, 24, 22);
    g.fillStyle(0xe9c97f, 1).fillCircle(14, 17, 2);
    g.fillStyle(0xe9c97f, 1).fillCircle(22, 17, 2);
    g.fillStyle(0xb9463f, 1).fillEllipse(18, 27, 8, 5);
    g.fillStyle(0x090304, 0.5).fillEllipse(18, 33, 10, 4);
    g.generateTexture('enemy_grunt_model', 36, 40);

    g.clear();
    g.fillStyle(0x120d10, 1).fillEllipse(22, 25, 34, 34);
    g.fillStyle(0x2d2b30, 1).fillRoundedRect(8, 11, 28, 26, 8);
    g.fillStyle(0x5b2125, 1).fillEllipse(22, 21, 14, 13);
    g.fillStyle(0x0a090b, 1).fillTriangle(7, 18, 13, 4, 18, 18);
    g.fillStyle(0x0a090b, 1).fillTriangle(37, 18, 31, 4, 26, 18);
    g.fillStyle(0x3a3338, 1).fillTriangle(6, 30, 1, 16, 15, 24);
    g.fillStyle(0x3a3338, 1).fillTriangle(38, 30, 43, 16, 29, 24);
    g.fillStyle(0x7a6c63, 1).fillTriangle(10, 32, 4, 40, 16, 35);
    g.fillStyle(0x7a6c63, 1).fillTriangle(34, 32, 40, 40, 28, 35);
    g.fillStyle(0xf3d69a, 1).fillCircle(17, 20, 2);
    g.fillStyle(0xf3d69a, 1).fillCircle(27, 20, 2);
    g.fillStyle(0xc94d42, 1).fillPoint(22, 28, 8);
    g.fillStyle(0x8c5a44, 1).fillRect(12, 32, 20, 4);
    g.generateTexture('enemy_elite_model', 44, 48);

    g.clear();
    g.fillStyle(0x0b0d12, 1).fillEllipse(28, 30, 40, 42);
    g.fillStyle(0x1f2731, 1).fillRoundedRect(10, 12, 36, 34, 10);
    g.fillStyle(0x4d1822, 1).fillEllipse(28, 24, 16, 14);
    g.fillStyle(0x090b10, 1).fillTriangle(10, 18, 17, 3, 22, 18);
    g.fillStyle(0x090b10, 1).fillTriangle(46, 18, 39, 3, 34, 18);
    g.fillStyle(0x1f2731, 1).fillTriangle(8, 38, 2, 18, 18, 25);
    g.fillStyle(0x1f2731, 1).fillTriangle(48, 38, 54, 18, 38, 25);
    g.fillStyle(0x61b4c0, 0.9).fillTriangle(6, 33, 0, 46, 16, 38);
    g.fillStyle(0x61b4c0, 0.9).fillTriangle(50, 33, 56, 46, 40, 38);
    g.fillStyle(0xf4ddb1, 1).fillCircle(22, 24, 2);
    g.fillStyle(0xf4ddb1, 1).fillCircle(34, 24, 2);
    g.fillStyle(0x6fd2d7, 1).fillPoint(28, 31, 10);
    g.fillStyle(0x223340, 1).fillRoundedRect(15, 36, 26, 7, 3);
    g.fillStyle(0x6fd2d7, 0.35).fillEllipse(28, 31, 16, 20);
    g.generateTexture('enemy_boss_model', 56, 58);

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
    g.fillStyle(0xb59467, 1).fillEllipse(16, 16, 28, 22);
    g.fillStyle(0xd1b07c, 1).fillEllipse(17, 13, 20, 11);
    g.fillStyle(0x866443, 1).fillRect(14, 6, 4, 8);
    g.generateTexture('grain_sack_model', 32, 28);

    g.clear();
    g.fillStyle(0x5d7f6a, 1).fillRoundedRect(2, 3, 20, 16, 2);
    g.fillStyle(0xc4d4c8, 1).fillRect(10, 5, 4, 12);
    g.fillStyle(0xc4d4c8, 1).fillRect(6, 9, 12, 4);
    g.generateTexture('med_model', 24, 24);

    g.clear();
    g.fillStyle(0x3f665c, 1).fillRoundedRect(2, 4, 30, 20, 4);
    g.fillStyle(0xdcece7, 1).fillRect(14, 8, 6, 12);
    g.fillStyle(0xdcece7, 1).fillRect(11, 11, 12, 6);
    g.fillStyle(0x1e3833, 1).fillRect(6, 16, 22, 2);
    g.generateTexture('medical_crate_model', 34, 28);

    g.clear();
    g.fillStyle(0x7a7f87, 1).fillRoundedRect(3, 4, 18, 14, 2);
    g.fillStyle(0x4a4f57, 1).fillRect(5, 8, 14, 2);
    g.fillStyle(0x4a4f57, 1).fillRect(5, 12, 14, 2);
    g.generateTexture('part_model', 24, 24);

    g.clear();
    g.fillStyle(0x6b553a, 1).fillRoundedRect(2, 4, 30, 18, 3);
    g.fillStyle(0xcfaa6d, 1).fillRect(6, 9, 20, 2);
    g.fillStyle(0xcfaa6d, 1).fillRect(6, 13, 16, 2);
    g.fillStyle(0x3d2a1a, 1).fillRect(8, 6, 2, 14);
    g.fillStyle(0x3d2a1a, 1).fillRect(24, 6, 2, 14);
    g.generateTexture('ammo_crate_model', 34, 26);

    g.clear();
    g.fillStyle(0x4b6075, 1).fillRoundedRect(2, 6, 30, 18, 4);
    g.fillStyle(0x8ca0b8, 1).fillRect(10, 4, 14, 4);
    g.fillStyle(0x253545, 1).fillRect(7, 12, 20, 2);
    g.fillStyle(0x253545, 1).fillRect(7, 16, 20, 2);
    g.generateTexture('tool_box_model', 34, 28);

    g.clear();
    g.fillStyle(0x7c5b3a, 1).fillRect(2, 10, 44, 10);
    g.fillStyle(0x4e3924, 1).fillCircle(12, 24, 7);
    g.fillStyle(0x4e3924, 1).fillCircle(34, 24, 7);
    g.fillStyle(0x9f784f, 1).fillRect(10, 6, 28, 4);
    g.fillStyle(0x5b4330, 1).fillRect(22, 2, 4, 12);
    g.generateTexture('wagon_wreck_model', 48, 32);

    g.clear();
    g.fillStyle(0x6b573d, 1).fillTriangle(4, 22, 18, 6, 30, 22);
    g.fillStyle(0x4b3725, 1).fillRect(7, 18, 20, 3);
    g.fillStyle(0x9d7a52, 0.88).fillTriangle(8, 20, 18, 9, 27, 20);
    g.generateTexture('tent_ruin_model', 34, 24);

    g.clear();
    g.fillStyle(0xd9d3b1, 1).fillCircle(4, 4, 3);
    g.generateTexture('bullet_model', 8, 8);

    g.clear();
    for (let i = 9; i >= 1; i -= 1) {
      g.fillStyle(0xffffff, 0.08 + i * 0.035).fillCircle(128, 128, i * 14);
    }
    g.generateTexture('fog_reveal', 256, 256);

    g.clear();
    g.fillStyle(0x4b2330, 1).fillCircle(16, 16, 15);
    g.fillStyle(0xa31d42, 1).fillEllipse(17, 10, 18, 12);
    g.fillStyle(0xd84a57, 1).fillTriangle(22, 8, 29, 4, 27, 14);
    g.fillStyle(0xf1c98f, 1).fillCircle(15, 13, 6);
    g.fillStyle(0xf0bf56, 1).fillTriangle(11, 9, 20, 8, 16, 3);
    g.fillStyle(0x6e1d2a, 1).fillRoundedRect(7, 16, 18, 10, 4);
    g.fillStyle(0x8f2e3f, 1).fillRect(10, 24, 14, 4);
    g.fillStyle(0xcba97b, 0.85).fillRect(7, 27, 18, 2);
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
    this.cameras.main.setBackgroundColor('#28150d');
    if (this.textures.exists('official_desert_bg')) {
      this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'official_desert_bg').setDepth(0).setAlpha(0.18);
    }

    const g = this.add.graphics();
    const gateY = FORTRESS_TOP;

    g.fillStyle(0x28150d, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    g.fillStyle(0x4f2617, 1).fillRect(0, 0, WORLD_WIDTH, 380);
    g.fillStyle(0x6e3920, 0.94).fillRect(0, 380, WORLD_WIDTH, 240);
    g.fillStyle(0xffbc69, 0.16).fillEllipse(620, 220, 980, 320);
    g.fillStyle(0xf9d087, 0.08).fillEllipse(620, 220, 620, 180);
    g.fillStyle(0x683820, 0.78).fillEllipse(560, 640, 1400, 280);
    g.fillStyle(0x5b311d, 0.84).fillEllipse(1960, 620, 1800, 320);
    g.fillStyle(0x4b2818, 0.92).fillEllipse(3320, 700, 2100, 380);

    g.fillStyle(0x855331, 1).fillRect(0, 620, WORLD_WIDTH, WORLD_HEIGHT - 620);
    g.fillStyle(0x9d6a3f, 0.92).fillEllipse(520, 2100, 1800, 520);
    g.fillStyle(0x8f5f38, 0.9).fillEllipse(1700, 1980, 2400, 600);
    g.fillStyle(0x7a4e2f, 0.92).fillEllipse(3320, 1920, 2400, 720);
    g.fillStyle(0xc08b56, 0.34).fillEllipse(1160, 1760, 1320, 260);
    g.fillStyle(0xd3a56b, 0.24).fillEllipse(2500, 1540, 1800, 320);
    g.fillStyle(0xb07a47, 0.18).fillEllipse(760, 1260, 880, 160);
    g.fillStyle(0xb07a47, 0.16).fillEllipse(1780, 1220, 1180, 180);
    g.fillStyle(0xb07a47, 0.14).fillEllipse(2960, 1140, 1260, 220);
    g.fillStyle(0x5c3822, 0.18).fillEllipse(2320, 1820, 1420, 260);
    g.fillStyle(0x5c3822, 0.14).fillEllipse(3440, 2140, 1180, 240);

    g.fillStyle(0x46625a, 0.18).fillRoundedRect(FORTRESS_LEFT + 40, FORTRESS_TOP + 90, FORTRESS_RIGHT - FORTRESS_LEFT - 80, FORTRESS_BOTTOM - FORTRESS_TOP - 150, 18);
    g.fillStyle(0x314740, 0.16).fillRoundedRect(FORTRESS_LEFT + 120, FORTRESS_TOP + 150, FORTRESS_RIGHT - FORTRESS_LEFT - 240, FORTRESS_BOTTOM - FORTRESS_TOP - 250, 18);
    g.fillStyle(0xa78054, 0.78).fillRoundedRect(FORTRESS_LEFT + 120, FORTRESS_BOTTOM - 180, FORTRESS_RIGHT - FORTRESS_LEFT - 240, 74, 18);
    g.fillStyle(0xcfb07c, 0.24).fillRect(FORTRESS_LEFT + 180, FORTRESS_BOTTOM - 154, FORTRESS_RIGHT - FORTRESS_LEFT - 360, 16);

    g.fillStyle(0x5b4330, 1).fillRect(FORTRESS_LEFT - 26, FORTRESS_TOP - 34, FORTRESS_RIGHT - FORTRESS_LEFT + 52, 34);
    g.fillStyle(0x5b4330, 1).fillRect(FORTRESS_LEFT - 26, FORTRESS_BOTTOM, FORTRESS_RIGHT - FORTRESS_LEFT + 52, 34);
    g.fillStyle(0x5b4330, 1).fillRect(FORTRESS_LEFT - 34, FORTRESS_TOP - 26, 34, FORTRESS_BOTTOM - FORTRESS_TOP + 52);
    g.fillStyle(0x5b4330, 1).fillRect(FORTRESS_RIGHT, FORTRESS_TOP - 26, 34, FORTRESS_BOTTOM - FORTRESS_TOP + 52);
    g.fillStyle(0xbe9b67, 0.9).fillRect(FORTRESS_LEFT - 26, FORTRESS_TOP - 18, GATE_X - GATE_WIDTH * 0.5 - FORTRESS_LEFT + 26, 10);
    g.fillStyle(0xbe9b67, 0.9).fillRect(GATE_X + GATE_WIDTH * 0.5, FORTRESS_TOP - 18, FORTRESS_RIGHT - (GATE_X + GATE_WIDTH * 0.5) + 26, 10);
    g.fillStyle(0x7f6144, 1).fillRect(GATE_X - 96, FORTRESS_TOP - 170, 192, 170);
    g.fillStyle(0x9b7650, 1).fillRoundedRect(GATE_X - 116, FORTRESS_TOP - 42, 232, 52, 10);
    g.fillStyle(0x493123, 1).fillRect(GATE_X - 78, FORTRESS_TOP - 138, 24, 96);
    g.fillStyle(0x493123, 1).fillRect(GATE_X + 54, FORTRESS_TOP - 138, 24, 96);
    g.fillStyle(0xe6c78f, 0.32).fillRect(GATE_X - 24, FORTRESS_TOP - 126, 48, 20);
    g.fillStyle(0xae7f4e, 0.56).fillRect(GATE_X - 54, FORTRESS_TOP + 8, 108, GATE_INNER_DEPTH - 48);

    for (let x = FORTRESS_LEFT + 14; x < FORTRESS_RIGHT; x += 58) {
      if (Math.abs(x - GATE_X) < GATE_WIDTH * 0.65) continue;
      this.add.rectangle(x, FORTRESS_TOP - 24, 22, 18, 0x8f6c49, 1).setDepth(6);
      this.add.rectangle(x, FORTRESS_BOTTOM + 24, 22, 18, 0x8f6c49, 1).setDepth(6);
    }
    for (let y = FORTRESS_TOP + 40; y < FORTRESS_BOTTOM; y += 62) {
      this.add.rectangle(FORTRESS_LEFT - 24, y, 18, 22, 0x8f6c49, 1).setDepth(6);
      this.add.rectangle(FORTRESS_RIGHT + 24, y, 18, 22, 0x8f6c49, 1).setDepth(6);
    }

    const beaconPoints = [
      { x: FORTRESS_LEFT + 120, y: FORTRESS_TOP - 90, glow: 0xffb962 },
      { x: GATE_X, y: FORTRESS_TOP - 110, glow: 0xffaa57 },
      { x: FORTRESS_RIGHT - 120, y: FORTRESS_TOP - 90, glow: 0xffb962 },
      { x: 2680, y: 820, glow: 0xff9242 },
      { x: 3380, y: 980, glow: 0xff9242 },
    ];
    beaconPoints.forEach((point) => {
      this.add.ellipse(point.x, point.y + 18, 36, 12, 0x000000, 0.24).setDepth(3);
      this.add.rectangle(point.x, point.y, 18, 58, 0x564131).setDepth(6);
      this.add.ellipse(point.x, point.y - 24, 58, 36, point.glow, 0.18).setDepth(7);
      this.add.ellipse(point.x, point.y - 22, 28, 20, point.glow, 0.55).setDepth(8);
    });

    const outposts = [
      { x: 2380, y: 1120, scale: 1.2 },
      { x: 3110, y: 920, scale: 1.3 },
      { x: 3520, y: 1560, scale: 1.08 },
    ];
    outposts.forEach((p) => {
      this.add.image(p.x, p.y, 'tower_model').setDepth(6).setScale(p.scale).setTint(0x7b5a3e);
      this.add.ellipse(p.x, p.y + 28, 38, 12, 0x000000, 0.24).setDepth(3);
    });

    this.add.rectangle(620, 2140, 980, 420, 0x284c44, 0.12).setStrokeStyle(2, 0x93c8b2, 0.32).setDepth(3);
    this.add.text(360, 1940, '长城内营地\n断粮防线 / 守军驻地 / 安全区', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#d8e9da',
      lineSpacing: 10,
    }).setDepth(10);
    this.add.text(GATE_X, gateY - 140, '唯一城门 · 补给出入口', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '24px',
      color: '#f3dfb4',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    this.add.text(2330, 1330, '废弃补给线\n粮车 / 药箱 / 军械散点', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#ead4ab',
      lineSpacing: 8,
    }).setDepth(10);
    this.add.text(3440, 1710, '魔种洗劫区\n补给稀少  风险升高', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#efbf96',
      lineSpacing: 8,
    }).setDepth(10);

    this.decorateSceneProps();
  }

  private decorateSceneProps(): void {
    const ruinedCamp = [
      { x: 348, y: 716, scale: 1.15 },
      { x: 1010, y: 470, scale: 1.05 },
      { x: 1470, y: 676, scale: 1.2 },
      { x: 2140, y: 1080, scale: 1.18 },
      { x: 2860, y: 980, scale: 1.24 },
      { x: 3380, y: 1520, scale: 1.28 },
    ];
    ruinedCamp.forEach((spot) => {
      this.add.image(spot.x, spot.y, 'tent_ruin_model')
        .setDepth(5)
        .setScale(spot.scale);
      this.add.image(spot.x - 36, spot.y - 10, 'grain_sack_model').setDepth(6).setScale(1 + spot.scale * 0.08);
      this.add.image(spot.x + 22, spot.y - 10, 'medical_crate_model').setDepth(6).setScale(0.94);
      this.add.image(spot.x + 60, spot.y - 8, 'tool_box_model').setDepth(6).setScale(0.88);
    });

    const sentryLine = [
      { x: 604, y: 256, flip: false },
      { x: 1128, y: 170, flip: true },
      { x: 1738, y: 548, flip: true },
    ];
    sentryLine.forEach((spot) => {
      if (this.textures.exists('phaser_palm')) {
        this.add.image(spot.x, spot.y, 'phaser_palm')
          .setDepth(5)
          .setScale(0.72)
          .setFlipX(spot.flip)
          .setTint(0x7d6a48);
      }
    });

    const debris = [
      { x: 820, y: 472 },
      { x: 866, y: 456 },
      { x: 1526, y: 302 },
      { x: 1572, y: 316 },
      { x: 1606, y: 296 },
      { x: 2450, y: 1090 },
      { x: 2488, y: 1122 },
      { x: 3130, y: 952 },
      { x: 3182, y: 1016 },
      { x: 3510, y: 1602 },
      { x: 3564, y: 1646 },
    ];
    debris.forEach((spot, idx) => {
      this.add.ellipse(spot.x, spot.y + 10, 16, 6, 0x000000, 0.18).setDepth(2);
      this.add.image(spot.x, spot.y, idx % 2 === 0 ? 'rock_model' : 'crate_model')
        .setDepth(5)
        .setScale(idx % 2 === 0 ? 0.56 : 0.72)
        .setTint(idx % 2 === 0 ? 0x847058 : 0x71634c);
    });

    const supplyRoad = [
      { x: 1820, y: 1670 },
      { x: 2020, y: 1540 },
      { x: 2250, y: 1410 },
      { x: 2490, y: 1290 },
      { x: 2750, y: 1180 },
      { x: 3020, y: 1080 },
      { x: 3270, y: 1180 },
      { x: 3490, y: 1360 },
    ];
    supplyRoad.forEach((spot, idx) => {
      this.add.ellipse(spot.x, spot.y + 12, 22, 8, 0x000000, 0.2).setDepth(2);
      const key = idx % 4 === 0 ? 'wagon_wreck_model' : idx % 4 === 1 ? 'grain_sack_model' : idx % 4 === 2 ? 'medical_crate_model' : 'ammo_crate_model';
      this.add.image(spot.x, spot.y, key)
        .setDepth(5)
        .setScale(key === 'wagon_wreck_model' ? 0.88 : 0.92);
      if (idx % 2 === 1) {
        this.add.image(spot.x + 26, spot.y - 12, idx % 4 === 1 ? 'tool_box_model' : 'grain_sack_model')
          .setDepth(6)
          .setScale(0.8);
      }
    });

    const innerCamp = [
      { x: 470, y: 2090 },
      { x: 660, y: 2210 },
      { x: 980, y: 2070 },
      { x: 1220, y: 2210 },
    ];
    innerCamp.forEach((spot, idx) => {
      this.add.ellipse(spot.x, spot.y + 14, 28, 10, 0x000000, 0.18).setDepth(2);
      this.add.image(spot.x, spot.y, idx % 2 === 0 ? 'grain_sack_model' : 'medical_crate_model')
        .setDepth(5)
        .setScale(0.92 + idx * 0.04)
        .setTint(0xffffff);
      this.add.image(spot.x + 40, spot.y - 10, idx % 2 === 0 ? 'food_model' : 'med_model')
        .setDepth(6)
        .setScale(1.08);
    });

    const raidedStations = [
      { x: 2080, y: 1460, key: 'wagon_wreck_model' },
      { x: 2600, y: 980, key: 'ammo_crate_model' },
      { x: 3330, y: 1440, key: 'medical_crate_model' },
      { x: 3650, y: 1860, key: 'tool_box_model' },
    ];
    raidedStations.forEach((spot, idx) => {
      this.add.image(spot.x, spot.y, spot.key).setDepth(5).setScale(spot.key === 'wagon_wreck_model' ? 0.84 : 0.9);
      this.add.image(spot.x + 28, spot.y - 4, idx % 2 === 0 ? 'part_model' : 'grain_sack_model').setDepth(6).setScale(0.82);
      this.add.ellipse(spot.x, spot.y + 14, 24, 8, 0x000000, 0.18).setDepth(2);
    });

    const duneShrubs = [
      { x: 1750, y: 820 }, { x: 1880, y: 980 }, { x: 2140, y: 910 }, { x: 2340, y: 1240 },
      { x: 2590, y: 1480 }, { x: 2920, y: 1320 }, { x: 3180, y: 1460 }, { x: 3360, y: 1820 },
      { x: 3610, y: 1710 }, { x: 3880, y: 1980 },
    ];
    duneShrubs.forEach((spot, idx) => {
      this.add.ellipse(spot.x, spot.y + 9, 18, 6, 0x000000, 0.16).setDepth(2);
      this.add.image(spot.x, spot.y, idx % 3 === 0 ? 'bush_model' : 'rock_model')
        .setDepth(4)
        .setScale(idx % 3 === 0 ? 0.88 : 0.52)
        .setTint(idx % 3 === 0 ? 0x8e704c : 0x7d6852);
    });

    const watchLine = [
      { x: 1980, y: 760 }, { x: 2540, y: 680 }, { x: 3120, y: 840 }, { x: 3720, y: 1180 },
    ];
    watchLine.forEach((spot, idx) => {
      this.add.image(spot.x, spot.y, 'tower_model')
        .setDepth(6)
        .setScale(0.9 + idx * 0.06)
        .setTint(0x7c5d40);
      this.add.ellipse(spot.x, spot.y + 24, 34, 11, 0x000000, 0.22).setDepth(2);
    });
  }

  private createObstacleColliders(): void {
    const blocks: ObstacleBlock[] = [
      { x: (FORTRESS_LEFT + (GATE_X - GATE_WIDTH * 0.5)) / 2, y: FORTRESS_TOP - 10, w: GATE_X - GATE_WIDTH * 0.5 - FORTRESS_LEFT + 40, h: 46 },
      { x: (FORTRESS_RIGHT + (GATE_X + GATE_WIDTH * 0.5)) / 2, y: FORTRESS_TOP - 10, w: FORTRESS_RIGHT - (GATE_X + GATE_WIDTH * 0.5) + 40, h: 46 },
      { x: FORTRESS_LEFT - 14, y: (FORTRESS_TOP + FORTRESS_BOTTOM) / 2, w: 42, h: FORTRESS_BOTTOM - FORTRESS_TOP + 60 },
      { x: FORTRESS_RIGHT + 14, y: (FORTRESS_TOP + FORTRESS_BOTTOM) / 2, w: 42, h: FORTRESS_BOTTOM - FORTRESS_TOP + 60 },
      { x: (FORTRESS_LEFT + FORTRESS_RIGHT) / 2, y: FORTRESS_BOTTOM + 14, w: FORTRESS_RIGHT - FORTRESS_LEFT + 60, h: 42 },
      { x: 2440, y: 1140, w: 320, h: 84 },
      { x: 3140, y: 980, w: 360, h: 96 },
      { x: 3520, y: 1560, w: 280, h: 88 },
      { x: 2860, y: 1820, w: 420, h: 96 },
    ];

    this.obstacleZones.forEach((zone) => zone.destroy());
    this.obstacleZones = [];

    const addObstacleZone = (b: ObstacleBlock): void => {
      const zone = this.add.zone(b.x, b.y, b.w, b.h);
      this.physics.add.existing(zone, true);
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(b.w, b.h);
      body.updateFromGameObject();
      this.obstacleZones.push(zone);
      this.physics.add.collider(this.player, zone);
      this.physics.add.collider(this.enemyGroup, zone);
    };

    blocks.forEach((b) => addObstacleZone(b));
  }

  private setupCameraAndAtmosphere(): void {
    this.cameras.main.setZoom(1.04);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, 0, 20);

    this.atmosphereFog = this.add.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0xc27c3d, 0.08)
      .setScrollFactor(0)
      .setDepth(520);

    this.atmosphereVignette = this.add.graphics().setScrollFactor(0).setDepth(530);
    this.atmosphereVignette.fillStyle(0x000000, 0.22);
    this.atmosphereVignette.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.atmosphereVignette.fillStyle(0x000000, 0);
    this.atmosphereVignette.fillCircle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 310);

    const sunGlow = this.add.ellipse(220, 120, 360, 200, 0xffc16a, 0.16)
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
    this.playerShadow = this.add.ellipse(460, 2148, 16, 8, 0x000000, 0.35).setDepth(2);
    const useStateSprite = this.textures.exists('shouyue_state_idle');
    const playerKey = useStateSprite ? 'shouyue_state_idle' : (this.textures.exists('official_shouyue') ? 'official_shouyue' : 'player_model');
    this.player = this.physics.add.sprite(460, 2134, playerKey).setDepth(6);
    if (useStateSprite) {
      this.player.setDisplaySize(54, 82);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setSize(14, 10);
      body.setOffset(20, 66);
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
      { x: 2060, y: 900, kind: 'grunt' as EnemyKind },
      { x: 2280, y: 1080, kind: 'grunt' as EnemyKind },
      { x: 2360, y: 1380, kind: 'grunt' as EnemyKind },
      { x: 2480, y: 1280, kind: 'elite' as EnemyKind },
      { x: 2820, y: 960, kind: 'grunt' as EnemyKind },
      { x: 2920, y: 1120, kind: 'grunt' as EnemyKind },
      { x: 3060, y: 1240, kind: 'elite' as EnemyKind },
      { x: 3260, y: 1360, kind: 'elite' as EnemyKind },
      { x: 3340, y: 1640, kind: 'grunt' as EnemyKind },
      { x: 3620, y: 1480, kind: 'grunt' as EnemyKind },
      { x: 3440, y: 1880, kind: 'grunt' as EnemyKind },
      { x: 3740, y: 1040, kind: 'boss' as EnemyKind },
    ];
    points.forEach((p) => this.spawnEnemy(p.x, p.y, p.kind));
  }

  private spawnEnemy(x: number, y: number, kind: EnemyKind = 'grunt'): void {
    if (this.isInsideInnerWall(x, y)) return;
    const shadow = this.add.ellipse(x, y + 12, 18, 8, 0x000000, 0.28).setDepth(2);
    const enemyKey = kind === 'boss' ? 'enemy_boss_model' : kind === 'elite' ? 'enemy_elite_model' : 'enemy_grunt_model';
    const sprite = this.physics.add.sprite(x, y, enemyKey).setDepth(6);
    const isElite = kind === 'elite';
    const isBoss = kind === 'boss';
    const scale = isBoss ? 84 : isElite ? 60 : 42;
    const hp = isBoss ? 1800 : isElite ? 620 : 300;
    const speed = isBoss ? 186 : isElite ? 132 : 92;
    const attackDamage = isBoss ? 58 : isElite ? 28 : 15;
    const chaseRadius = isBoss ? 720 : isElite ? 500 : 340;
    sprite.setDisplaySize(scale, scale);
    sprite.setCollideWorldBounds(true);
    this.enemyGroup.add(sprite);
    this.enemies.push({
      sprite,
      shadow,
      kind,
      hp,
      maxHp: hp,
      speed,
      attackDamage,
      chaseRadius,
      wanderDir: new Phaser.Math.Vector2(Phaser.Math.Between(-1, 1) || 1, Phaser.Math.Between(-1, 1) || -1).normalize(),
      lastAttackAt: 0,
      anchor: new Phaser.Math.Vector2(x, y),
      nextRetargetAt: this.time.now + Phaser.Math.Between(1200, 2600),
      stealthUntil: isBoss ? this.time.now + 1800 : undefined,
      burstReadyAt: isBoss ? this.time.now + 3400 : undefined,
    });
  }


  private spawnLootContainers(): void {
    this.lootContainers = SUPPLY_CACHE_LAYOUT.map((spot) => {
      const shadow = this.add.ellipse(spot.x, spot.y + 13, 28, 10, 0x000000, 0.25).setDepth(2);
      const textureKey =
        spot.theme === 'grain'
          ? 'wagon_wreck_model'
          : spot.theme === 'medical'
            ? 'medical_crate_model'
            : spot.theme === 'ordnance'
              ? 'ammo_crate_model'
              : spot.theme === 'survival'
                ? 'tent_ruin_model'
                : 'tool_box_model';
      const sprite = this.add.sprite(spot.x, spot.y, textureKey).setDepth(5);
      sprite.setDisplaySize(
        spot.theme === 'grain' ? 62 : spot.theme === 'survival' ? 56 : 44,
        spot.theme === 'grain' ? 42 : spot.theme === 'survival' ? 34 : 30,
      );
      this.add.circle(spot.x, spot.y - 8, 24, 0xf6d89a, 0.06).setDepth(4);
      return {
        sprite,
        shadow,
        title: spot.title,
        opened: false,
        theme: spot.theme,
        prompt: spot.prompt,
        hint: getSupplyPrompt(spot.items.map((item) => item.id)),
        items: buildSupplyItems(spot.items),
      };
    });
  }


  private spawnNpcs(): void {
    const points: Array<{ x: number; y: number; key: string; name: keyof typeof NPC_PROFILE_COPY }> = [
      {
        x: 420,
        y: 1980,
        key: this.textures.exists('official_npc_mulan') ? 'official_npc_mulan' : 'npc_mulan',
        name: '花木兰',
      },
      {
        x: 520,
        y: 2050,
        key: this.textures.exists('official_npc_kai') ? 'official_npc_kai' : 'npc_kai',
        name: '铠',
      },
      {
        x: 640,
        y: 2110,
        key: this.textures.exists('official_npc_xuance') ? 'official_npc_xuance' : 'npc_xuance',
        name: '百里玄策',
      },
    ];

    this.npcs = points.map((it) => {
      const profile = NPC_PROFILE_COPY[it.name];
      const route = (NPC_PATROL_ROUTES[it.name] ?? [{ x: it.x, y: it.y }]).map((point) => new Phaser.Math.Vector2(point.x, point.y));
      const speed = it.name === '花木兰' ? 34 : it.name === '铠' ? 52 : 76;
      const shadow = this.add.ellipse(it.x, it.y + 12, 18, 8, 0x000000, 0.27).setDepth(2);
      const displaySize = it.key.startsWith('official_') ? 52 : 42;
      const sprite = this.add.sprite(it.x, it.y, it.key).setDisplaySize(displaySize, displaySize).setDepth(7);
      const label = this.add.text(it.x, it.y - 34, it.name, {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: '14px',
        color: '#f2e7cd',
      }).setDepth(20).setOrigin(0.5);
      return {
        sprite,
        shadow,
        label,
        name: it.name,
        role: profile.role,
        line: profile.line,
        persona: profile.persona,
        state: it.name === '花木兰' ? 'guard' : 'patrol',
        speed,
        patrolRoute: route,
        patrolIndex: 0,
        target: route[0]?.clone() ?? new Phaser.Math.Vector2(it.x, it.y),
        stateUntil: this.time.now + Phaser.Math.Between(700, 1500),
        talkCooldownUntil: 0,
      };
    });
  }

  private createUi(): void {
    const topPanel = this.add.rectangle(250, 152, 468, 250, 0x0f181d, 0.86)
      .setStrokeStyle(2, 0x3a5660, 0.92)
      .setDepth(28)
      .setScrollFactor(0);
    const bottomPanel = this.add.rectangle(640, 642, 1240, 120, 0x0f171c, 0.74)
      .setStrokeStyle(2, 0x2d4a53, 0.86)
      .setDepth(28)
      .setScrollFactor(0);
    this.hudDecor = [topPanel, bottomPanel];

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
    this.hudDetailItems = [this.hudTop, this.hudRisk, this.skillBoard];

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

    this.createHudToggle();
    this.createHotbar();
    this.createLootPanel();
    this.createCrosshair();
    this.createDialogueOverlay();
    this.interactionRing = this.add.ellipse(0, 0, 68, 24, 0xffe2a2, 0.08)
      .setStrokeStyle(2, 0xffd48c, 0.75)
      .setDepth(24)
      .setVisible(false);
    this.interactionWorldHint = this.add.text(0, 0, '', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '16px',
      color: '#f6e7c3',
      backgroundColor: '#1a1714dd',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(25).setVisible(false);
  }

  private createDialogueOverlay(): void {
    if (!this.dialogueOverlay) {
      this.dialogueOverlay = new DialogueOverlay();
      this.dialogueOverlay.setOnSubmit((message) => {
        void this.handleDialogueSubmit(message);
      });
    }
  }

  private isDialogueOpen(): boolean {
    return this.dialogueOverlay?.isVisible() ?? false;
  }

  private createHudToggle(): void {
    const bg = this.add.rectangle(1186, 34, 132, 34, 0x0f171c, 0.86)
      .setStrokeStyle(2, 0x507c84, 0.92);
    const label = this.add.text(1186, 34, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '14px',
      color: '#d9e6df',
    }).setOrigin(0.5);

    this.hudToggleButton = this.add.container(0, 0, [bg, label])
      .setDepth(34)
      .setScrollFactor(0)
      .setSize(132, 34)
      .setInteractive(
        new Phaser.Geom.Rectangle(1120, 17, 132, 34),
        Phaser.Geom.Rectangle.Contains,
      );
    this.hudToggleLabel = label;
    this.hudToggleButton.on('pointerdown', () => this.toggleHudVisibility());
    this.syncHudVisibility();
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

    this.lootTitle = this.add.text(640, 120, '补给整理', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '28px',
      color: '#e7f0ea',
    }).setOrigin(0.5).setDepth(61).setScrollFactor(0).setVisible(false);

    this.invHeader = this.add.text(220, 170, '守约背包', {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: '20px',
      color: '#c7dbd1',
    }).setDepth(61).setScrollFactor(0).setVisible(false);

    this.boxHeader = this.add.text(760, 170, '当前补给点', {
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
    this.keys = keyboard!.addKeys('W,A,S,D,SHIFT,SPACE,Q,E,F,R,TAB,H') as Record<string, Phaser.Input.Keyboard.Key>;
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
        this.dropEnemyLoot(hit);
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

  private playLoadedSfx(keys: string[], volume = 0.45, rate = 1): boolean {
    const available = keys.filter((key) => this.cache.audio.exists(key));
    if (available.length === 0) return false;
    const poolKey = available.join('|');
    const nextIndex = this.sfxVariantIndex[poolKey] ?? 0;
    const choice = available[nextIndex % available.length];
    this.sfxVariantIndex[poolKey] = nextIndex + 1;
    this.sound.play(choice, { volume, rate });
    return true;
  }

  private triggerDashCounterShot(): void {
    const weapon = this.currentWeapon();
    const currentMag = this.weaponMags[weapon.id];
    if (currentMag <= 0) {
      this.hudHint.setText('后撤完成，但弹匣已空');
      return;
    }
    this.weaponMags[weapon.id] = currentMag - 1;
    this.lastFireAt = this.time.now;
    this.fireProjectile(weapon, 'dash');
  }

  private getMuzzleWorldPosition(aim = this.aimDir): Phaser.Math.Vector2 {
    const sideOffset = this.player.flipX ? -3 : 3;
    return new Phaser.Math.Vector2(
      this.player.x + aim.x * 18 + aim.y * sideOffset,
      this.player.y - 6 + aim.y * 10 - aim.x * sideOffset,
    );
  }

  private playSfx(type: 'shot' | 'scan' | 'snipeCharge' | 'snipeFire' | 'dash' | 'hurt'): void {
    if (type === 'shot') {
      if (this.playLoadedSfx(['sfx_shouyue_basic_a', 'sfx_shouyue_basic_b'], 0.4, Phaser.Math.FloatBetween(0.985, 1.015))) {
        return;
      }
    }

    if (type === 'snipeCharge') {
      if (this.playLoadedSfx(['sfx_shouyue_snipe_charge_a', 'sfx_shouyue_snipe_charge_b'], 0.46, Phaser.Math.FloatBetween(0.99, 1.01))) {
        return;
      }
    }

    if (type === 'snipeFire') {
      if (this.playLoadedSfx(['sfx_shouyue_snipe_fire_a', 'sfx_shouyue_snipe_fire_b'], 0.74, Phaser.Math.FloatBetween(0.97, 1.0))) {
        return;
      }
    }

    if (type === 'dash') {
      if (this.playLoadedSfx(['sfx_shouyue_snipe_fire_a', 'sfx_shouyue_snipe_fire_b'], 0.42, Phaser.Math.FloatBetween(1.02, 1.08))) {
        return;
      }
    }

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

    if (type === 'snipeCharge' || type === 'snipeFire') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(type === 'snipeCharge' ? 280 : 120, now);
      osc.frequency.exponentialRampToValueAtTime(type === 'snipeCharge' ? 980 : 680, now + (type === 'snipeCharge' ? 0.18 : 0.12));
      gain.gain.setValueAtTime(type === 'snipeCharge' ? 0.1 : 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'snipeCharge' ? 0.22 : 0.16));
      osc.start(now);
      osc.stop(now + (type === 'snipeCharge' ? 0.24 : 0.18));
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
    this.showNpcDialog(STORY_INTRO_LINES[0]);
    this.time.delayedCall(4800, () => {
      this.showNpcDialog(STORY_INTRO_LINES[1]);
    });
    if (this.aiAssistantEnabled) {
      this.time.delayedCall(9200, () => {
        this.showNpcDialog(STORY_INTRO_LINES[2]);
      });
    }
  }

  update(time: number, delta: number): void {
    if (this.resultShown) return;
    this.elapsedMs += delta;
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
      this.toggleHudVisibility();
    }
    this.updatePressure(time);
    this.handleSlotSwitch();
    this.handleSkills(time);
    this.handleReload(time);
    this.movePlayer(delta);
    this.updateEnemies();
    this.updateNpcs(time, delta);
    this.handleCombat(time);
    this.handleInteraction();
    this.updateInteractionFocus();
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

    if (time >= this.reinforceAt && this.enemies.length < 18) {
      this.spawnEnemyAtEdge();
      this.reinforceAt += this.missionConfig.mode === 'pressure' ? 9000 : 14000;
      this.hudHint.setText('外线又有一批魔种压上来了，优先处理贴脸的，再继续搜补给。');
    }
  }

  private getNearestEnemyDistance(x: number, y: number): number {
    let nearest = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
      if (dist < nearest) nearest = dist;
    }
    return nearest;
  }

  private setNpcState(npc: NpcUnit, state: NpcUnit['state'], time: number, holdMin = 650, holdMax = 1400): void {
    npc.state = state;
    npc.stateUntil = time + Phaser.Math.Between(holdMin, holdMax);
  }

  private assignNextNpcPatrolTarget(npc: NpcUnit): void {
    if (npc.patrolRoute.length === 0) return;
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolRoute.length;
    npc.target.copy(npc.patrolRoute[npc.patrolIndex]);
  }

  private tryNpcBattlefieldLine(npc: NpcUnit, time: number, playerDist: number, nearestEnemy: number): void {
    if (!this.aiAssistantEnabled) return;
    if (this.dialogueOverlay?.isVisible() || this.lootPanelOpen || this.resultShown) return;
    if (this.npcDialog.visible || time < npc.talkCooldownUntil || playerDist > 340) return;

    let line: string | null = null;
    if (npc.name === '花木兰') {
      if (this.objectiveCollected >= this.objectiveNeed) line = '花木兰｜军令\n补给已经够了，别再压深，把东西稳稳带回城里。';
      else if (this.pressure >= 75) line = '花木兰｜军令\n别在开阔地跟他们硬换，粮和药比多杀几只更值。';
    } else if (npc.name === '铠') {
      if (nearestEnemy < 190) line = '铠｜前线提醒\n魔种快贴上来了，退半步打，别让它们把你卡在废墟口。';
      else if (this.hp <= 45) line = '铠｜前线提醒\n你血掉得快，先拿稳已经到手的东西，再想下一处。';
    } else {
      if (this.objectiveCollected < this.objectiveNeed && playerDist > 170) line = '百里玄策｜外线回报\n别走太直，绕那边沙坡，粮袋和药箱还没被扫干净。';
      else if (this.pressure >= 70) line = '百里玄策｜外线回报\n外侧有新动静，路口开始收了，拿了就别多停。';
    }

    if (!line) return;
    npc.talkCooldownUntil = time + Phaser.Math.Between(12000, 18000);
    this.showNpcDialog(line);
  }

  private updateNpcs(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const npc of this.npcs) {
      const playerDist = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, this.player.x, this.player.y);
      const nearestEnemy = this.getNearestEnemyDistance(npc.sprite.x, npc.sprite.y);
      const route = npc.patrolRoute;

      if (npc.name === '花木兰') {
        const gatePoint = route[1] ?? route[0];
        if (this.pressure >= 70 || nearestEnemy < 230) {
          npc.target.copy(gatePoint);
          this.setNpcState(npc, 'warn', time, 900, 1600);
        } else if (time >= npc.stateUntil && npc.state !== 'observe') {
          this.setNpcState(npc, 'observe', time, 900, 1800);
        } else if (time >= npc.stateUntil) {
          npc.target.copy(route[(npc.patrolIndex + 1) % route.length] ?? gatePoint);
          this.assignNextNpcPatrolTarget(npc);
          this.setNpcState(npc, 'patrol', time, 1100, 1900);
        }
      } else if (npc.name === '铠') {
        const supportPoint = playerDist > 180
          ? new Phaser.Math.Vector2(
              Phaser.Math.Clamp(this.player.x - this.aimDir.x * 90, 760, 1420),
              Phaser.Math.Clamp(this.player.y - this.aimDir.y * 70, 1660, 2010),
            )
          : route[npc.patrolIndex] ?? new Phaser.Math.Vector2(npc.sprite.x, npc.sprite.y);
        if (nearestEnemy < 220 || this.pressure >= 68) {
          npc.target.copy(supportPoint);
          this.setNpcState(npc, 'support', time, 700, 1300);
        } else if (time >= npc.stateUntil) {
          this.assignNextNpcPatrolTarget(npc);
          this.setNpcState(npc, 'patrol', time, 900, 1600);
        }
      } else {
        if (time >= npc.stateUntil || Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, npc.target.x, npc.target.y) < 24) {
          const leap = Phaser.Math.Between(1, Math.min(2, route.length - 1));
          npc.patrolIndex = (npc.patrolIndex + leap) % route.length;
          npc.target.copy(route[npc.patrolIndex]);
          this.setNpcState(npc, Phaser.Math.Between(0, 1) === 0 ? 'patrol' : 'observe', time, 420, 1100);
        }
        if (this.pressure >= 72 && nearestEnemy < 260) {
          npc.state = 'warn';
        }
      }

      const toTarget = new Phaser.Math.Vector2(npc.target.x - npc.sprite.x, npc.target.y - npc.sprite.y);
      const distance = toTarget.length();
      let speedScale = 0;
      if (npc.state === 'patrol') speedScale = npc.name === '百里玄策' ? 1 : 0.7;
      else if (npc.state === 'support') speedScale = 0.95;
      else if (npc.state === 'warn') speedScale = 0.65;
      else if (npc.state === 'guard') speedScale = 0.45;
      else speedScale = distance > 34 ? 0.35 : 0;

      if (distance > 10 && speedScale > 0) {
        const step = Math.min(distance, npc.speed * speedScale * dt);
        toTarget.normalize().scale(step);
        npc.sprite.x += toTarget.x;
        npc.sprite.y += toTarget.y;
        npc.sprite.setFlipX(toTarget.x < 0);
      }

      const bob = npc.state === 'observe' ? Math.sin((time + npc.sprite.x) * 0.005) * 1.5 : 0;
      npc.shadow.x = npc.sprite.x;
      npc.shadow.y = npc.sprite.y + 12;
      npc.label.x = npc.sprite.x;
      npc.label.y = npc.sprite.y - 34 + bob;
      npc.label.setAlpha(npc.state === 'warn' ? 1 : 0.92);
      npc.sprite.setAlpha(npc.state === 'warn' ? 1 : 0.96);

      this.tryNpcBattlefieldLine(npc, time, playerDist, nearestEnemy);
    }
  }

  private movePlayer(delta: number): void {
    const lockInput = this.lootPanelOpen || this.resultShown || this.dialogueOverlay?.isVisible();
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

    if (this.skillSnipeActiveUntil > this.time.now) {
      body.setVelocity(0);
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

    this.resolveGreatWallBarrier(body);
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
      if (this.isInsideInnerWall(enemy.sprite.x, enemy.sprite.y) && !this.isInsideGateCorridor(enemy.sprite.x, enemy.sprite.y)) {
        enemy.sprite.y = FORTRESS_TOP - 30;
        body.setVelocityY(-120);
      }

      const target = new Phaser.Math.Vector2();
      const playerInSafeZone = this.isInsideInnerWall(this.player.x, this.player.y) && !this.isInsideGateCorridor(this.player.x, this.player.y);
      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y);
      const playerDist = toPlayer.length();
      const shouldChasePlayer = !playerInSafeZone && playerDist < enemy.chaseRadius;

      if (shouldChasePlayer) {
        target.copy(this.player);
      } else {
        if (this.time.now >= enemy.nextRetargetAt || Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, enemy.anchor.x, enemy.anchor.y) < 24) {
          enemy.anchor.set(
            Phaser.Math.Clamp(enemy.anchor.x + Phaser.Math.Between(-260, 260), 1760, WORLD_WIDTH - 160),
            Phaser.Math.Clamp(enemy.anchor.y + Phaser.Math.Between(-220, 220), 180, WORLD_HEIGHT - 140),
          );
          if (this.isInsideInnerWall(enemy.anchor.x, enemy.anchor.y)) {
            enemy.anchor.y = FORTRESS_TOP - Phaser.Math.Between(120, 260);
          }
          enemy.nextRetargetAt = this.time.now + Phaser.Math.Between(1500, 3200);
        }
        target.copy(enemy.anchor);
      }

      if (enemy.kind === 'boss') {
        if ((enemy.stealthUntil ?? 0) > this.time.now) {
          enemy.sprite.setAlpha(0.28);
        } else {
          enemy.sprite.setAlpha(1);
        }
        if (shouldChasePlayer && this.time.now >= (enemy.burstReadyAt ?? 0) && playerDist < 240) {
          const dash = toPlayer.clone().normalize().scale(300);
          body.setVelocity(dash.x, dash.y);
          enemy.burstReadyAt = this.time.now + 5000;
        }
      }

      const steering = new Phaser.Math.Vector2(target.x - enemy.sprite.x, target.y - enemy.sprite.y);
      if (steering.lengthSq() > 0) {
        steering.normalize();
      }

      const edgePush = new Phaser.Math.Vector2();
      if (enemy.sprite.x < 130) edgePush.x += 1;
      if (enemy.sprite.x > WORLD_WIDTH - 130) edgePush.x -= 1;
      if (enemy.sprite.y < 120) edgePush.y += 1;
      if (enemy.sprite.y > WORLD_HEIGHT - 120) edgePush.y -= 1;

      const separation = new Phaser.Math.Vector2();
      for (const other of this.enemies) {
        if (other === enemy) continue;
        const dx = enemy.sprite.x - other.sprite.x;
        const dy = enemy.sprite.y - other.sprite.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 0 && distSq < 90 * 90) {
          separation.x += dx / distSq;
          separation.y += dy / distSq;
        }
      }

      const velocity = steering.scale(shouldChasePlayer ? enemy.speed + this.pressure * 0.35 : enemy.speed * 0.72)
        .add(edgePush.scale(90))
        .add(separation.scale(6200));
      body.setVelocity(velocity.x, velocity.y);
      const maxSpeed = shouldChasePlayer ? enemy.speed + 8 : enemy.speed * 0.75;
      if (body.velocity.lengthSq() > maxSpeed ** 2) {
        body.velocity.normalize().scale(maxSpeed);
      }

      if (playerDist < (enemy.kind === 'boss' ? 50 : enemy.kind === 'elite' ? 38 : 34) && !playerInSafeZone && this.time.now - enemy.lastAttackAt > (enemy.kind === 'boss' ? 760 : enemy.kind === 'elite' ? 540 : 620)) {
        const damage = enemy.kind === 'boss'
          ? (this.hp < 45 ? this.hp : enemy.attackDamage)
          : enemy.attackDamage + Math.floor(this.pressure / (enemy.kind === 'elite' ? 28 : 35));
        this.hp = Math.max(0, this.hp - damage);
        enemy.lastAttackAt = this.time.now;
        this.setPlayerVisualState('hurt', 220);
        this.playSfx('hurt');
      }

      const marked = this.scoutEyes.some((eye) => Phaser.Math.Distance.Between(eye.x, eye.y, enemy.sprite.x, enemy.sprite.y) < 180);
      enemy.sprite.setTint(marked ? 0xffc38d : 0xffffff);
      enemy.shadow.x = enemy.sprite.x;
      enemy.shadow.y = enemy.sprite.y + 12;
      enemy.sprite.x = Phaser.Math.Clamp(enemy.sprite.x, 22, WORLD_WIDTH - 22);
      enemy.sprite.y = Phaser.Math.Clamp(enemy.sprite.y, 22, WORLD_HEIGHT - 22);
    }
  }

  private handleCombat(time: number): void {
    if (this.isDialogueOpen()) return;
    if (this.lootPanelOpen || this.resultShown || this.reloadFinishAt > time) return;
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

  private fireProjectile(weapon: WeaponConfig, shotMode?: 'basic' | 'snipe' | 'dash'): void {
    const pointer = this.input.activePointer;
    const dir = new Phaser.Math.Vector2(pointer.worldX - this.player.x, pointer.worldY - this.player.y).normalize();
    const muzzleOrigin = this.getMuzzleWorldPosition(dir);
    const bullet = this.bullets.get(muzzleOrigin.x, muzzleOrigin.y, 'bullet_model') as Phaser.Physics.Arcade.Image | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true).setDisplaySize(10, 10).setDepth(7);

    const spread = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-weapon.spreadDeg, weapon.spreadDeg));
    const rotated = dir.clone().rotate(spread);
    const resolvedShotMode = shotMode ?? (this.skillSnipeActiveUntil > this.time.now ? 'snipe' : 'basic');
    const isSnipeShot = resolvedShotMode === 'snipe';
    const projectileSpeed = resolvedShotMode === 'snipe' ? weapon.projectileSpeed * 1.2 : weapon.projectileSpeed;
    const bulletDamage = resolvedShotMode === 'dash' ? 320 : resolvedShotMode === 'snipe' ? 300 : 280;
    const bulletRange = resolvedShotMode === 'snipe' ? SNIPE_ATTACK_RANGE : NORMAL_ATTACK_RANGE;
    const lifeMs = Math.floor((bulletRange / projectileSpeed) * 1000);
    bullet.setData('damage', bulletDamage);
    bullet.setVelocity(rotated.x * projectileSpeed, rotated.y * projectileSpeed);
    bullet.setData('range', bulletRange);
    if (isSnipeShot) {
      bullet.setTint(0xffd38a);
      this.playSfx('snipeFire');
      this.skillSnipeActiveUntil = this.time.now + 220;
    } else if (resolvedShotMode === 'dash') {
      bullet.setTint(0xb9d9ff);
      this.playSfx('dash');
    } else {
      bullet.setTint(0xffffff);
      this.playSfx('shot');
    }
    this.setPlayerVisualState('fire', 140);

    const muzzle = this.add.circle(
      muzzleOrigin.x + rotated.x * 6,
      muzzleOrigin.y + rotated.y * 6,
      resolvedShotMode === 'snipe' ? 9 : resolvedShotMode === 'dash' ? 7 : 6,
      0xffe6b8,
      0.9,
    ).setDepth(1200);
    this.tweens.add({
      targets: muzzle,
      alpha: 0,
      scaleX: 0.12,
      scaleY: 0.12,
      duration: isSnipeShot ? 124 : 100,
      onComplete: () => muzzle.destroy(),
    });

    for (let i = 0; i < (isSnipeShot ? 6 : 4); i += 1) {
        const spark = this.add.circle(
          muzzleOrigin.x + rotated.x * 12,
          muzzleOrigin.y + rotated.y * 12,
          Phaser.Math.Between(2, 4),
          isSnipeShot ? 0xffbf63 : 0xffe7b8,
          0.95,
      ).setDepth(1190);
      this.tweens.add({
        targets: spark,
        x: spark.x + rotated.x * Phaser.Math.Between(24, 44) + Phaser.Math.Between(-8, 8),
        y: spark.y + rotated.y * Phaser.Math.Between(24, 44) + Phaser.Math.Between(-8, 8),
        alpha: 0,
        duration: isSnipeShot ? 190 : 150,
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
    if (this.isDialogueOpen()) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.TAB) && this.time.now - this.lastBagToggleAt > 180) {
      this.lastBagToggleAt = this.time.now;
      this.lootPanelOpen = !this.lootPanelOpen;
      this.activeLoot = undefined;
      this.refreshLootPanel();
    }
  }

  private handleSkills(time: number): void {
    if (this.isDialogueOpen()) return;
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
      this.hudHint.setText('已展开静谧之眼：能更容易看清废墟和沙尘后的魔种。');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && time >= this.skillSnipeReadyAt) {
      this.skillSnipeReadyAt = time + 12000;
      this.skillSnipeActiveUntil = time + 4500;
      const glow = this.add.circle(this.player.x, this.player.y, 26, 0xffbf7a, 0.18).setDepth(16);
      glow.setStrokeStyle(2, 0xffd38a, 0.8);
      this.tweens.add({
        targets: glow,
        radius: 78,
        alpha: 0,
        duration: 520,
        onComplete: () => glow.destroy(),
      });
      this.hudHint.setText('狂风之息展开：原地架枪，清掉挡住补给线的高威胁目标。');
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

      this.hudHint.setText('后撤反击已触发：留住退路，别让魔种贴身把补给压掉。');
      this.time.delayedCall(90, () => {
        if (!this.player.active || this.isDialogueOpen()) return;
        this.triggerDashCounterShot();
      });
    }

    this.scoutEyes = this.scoutEyes.filter((eye) => {
      if (time < eye.expireAt) return true;
      eye.ring.destroy();
      return false;
    });
  }

  private getNearbyNpc(maxDistance = 96): NpcUnit | undefined {
    return this.npcs.find((npc) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y) < maxDistance,
    );
  }

  private getNearbyLoot(maxDistance = 82): LootContainer | undefined {
    return this.lootContainers.find((box) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, box.sprite.x, box.sprite.y) < maxDistance,
    );
  }

  private updateInteractionFocus(): void {
    const nearestNpc = this.getNearbyNpc(112);
    const nearestLoot = this.getNearbyLoot(96);
    const npcDist = nearestNpc ? Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestNpc.sprite.x, nearestNpc.sprite.y) : Number.POSITIVE_INFINITY;
    const lootDist = nearestLoot ? Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestLoot.sprite.x, nearestLoot.sprite.y) : Number.POSITIVE_INFINITY;

    let nextTarget: typeof this.activeInteractionTarget;
    if (npcDist <= lootDist && nearestNpc) nextTarget = { type: 'npc', ref: nearestNpc };
    else if (nearestLoot) nextTarget = { type: 'loot', ref: nearestLoot };
    else nextTarget = undefined;

    this.activeInteractionTarget = nextTarget;
    if (!nextTarget || this.dialogueOverlay?.isVisible() || this.lootPanelOpen) {
      this.interactionRing.setVisible(false);
      this.interactionWorldHint.setVisible(false);
      return;
    }

    const pulse = 0.6 + Math.sin(this.time.now * 0.01) * 0.16;
    const targetSprite = nextTarget.ref.sprite;
    this.interactionRing
      .setVisible(true)
      .setPosition(targetSprite.x, targetSprite.y + 18)
      .setAlpha(0.35 + pulse * 0.25)
      .setScale(nextTarget.type === 'npc' ? 1 : 0.92);
    const hintText = nextTarget.type === 'npc'
      ? `F 会商｜${(nextTarget.ref as NpcUnit).name}`
      : `F 搜索｜${(nextTarget.ref as LootContainer).title}`;
    this.interactionWorldHint
      .setVisible(true)
      .setText(hintText)
      .setPosition(targetSprite.x, targetSprite.y - 42);
  }

  private getContextPrompt(): string {
    const nearbyNpc = this.getNearbyNpc();
    if (nearbyNpc) {
      return `F 会商｜${nearbyNpc.name}：${nearbyNpc.line}`;
    }

    const nearbyLoot = this.getNearbyLoot();
    if (nearbyLoot) {
      return `F 搜索｜${nearbyLoot.title} · ${nearbyLoot.prompt ?? '检查补给'}${nearbyLoot.hint ? ` · ${nearbyLoot.hint}` : ''}`;
    }

    if (this.pressure >= 78) {
      return '战况告警：外围魔种开始收口，别在空地停太久。';
    }

    if (this.objectiveCollected >= this.objectiveNeed) {
      return '补给目标已够：稳住节奏，把成果带回长城。';
    }

    return '任务重点：军粮、守城医疗包、守城器械零件。';
  }

  private handleInteraction(): void {
    if (this.isDialogueOpen()) return;
    if (!Phaser.Input.Keyboard.JustDown(this.keys.F) || this.time.now - this.lastInteractAt < 180) return;
    this.lastInteractAt = this.time.now;

    const nearestNpc = this.getNearbyNpc();
    if (nearestNpc) {
      this.activeDialogueNpc = nearestNpc;
      const history = this.getNpcMemory(nearestNpc.name);
      this.dialogueHistory = history;
      this.dialogueOverlay?.show(`${nearestNpc.name}｜${nearestNpc.role}`);
      if (history.length === 0) {
        history.push({ speaker: nearestNpc.name, content: nearestNpc.line });
      }
      this.renderDialogueHistory(history);
      this.dialogueOverlay?.append({
        speaker: '系统',
        content: this.aiAssistantEnabled
          ? '腾讯混元角色 AI 已接入，角色会按当前战况继续回答。'
          : '本局没有开启腾讯混元角色对话，返回任务准备页打开它后再进入任务。',
        tone: 'system',
      });
      this.hudHint.setText(`已与 ${nearestNpc.name} 建立战地联络`);
      return;
    }

    const nearest = this.getNearbyLoot();
    if (!nearest) {
      this.hudHint.setText('附近没有可会商的队友，也没有可搜索的补给点。');
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
        return `战术提示：外线威胁很高，优先绕开魔种，至少还要带回 ${remain} 份关键补给。`;
      }
      return `任务推进：已回收 ${this.objectiveCollected}/${this.objectiveNeed}，继续找军粮、药箱和器械零件。`;
    }
    return '任务推进：关键补给已经够了，别再贪战，准备把成果带回长城。';
  }

  private getNoviceGuideHint(): string | null {
    const elapsedSec = (this.time.now - this.missionStartAt) / 1000;
    if (elapsedSec > 90) return null;
    if (elapsedSec <= 20) {
      return '新手引导①：先靠近花木兰 / 铠 / 玄策并按 F，确认第一批补给去向。';
    }
    if (elapsedSec <= 45) {
      return '新手引导②：优先搜近点粮车和药箱，先拿到第 1 份关键补给。';
    }
    if (elapsedSec <= 70) {
      return '新手引导③：Q 用来查路和找埋伏，E 用来架枪清掉挡线目标。';
    }
    return '新手引导④：被近身时用 Space 后撤反击，保住已经到手的补给。';
  }

  private showNpcDialog(content: string): void {
    this.npcDialog.setText(content).setVisible(true);
    this.npcDialogHideEvent?.remove(false);
    this.npcDialogHideEvent = this.time.delayedCall(4200, () => {
      this.npcDialog.setVisible(false);
    });
  }

  private showBannerMessage(message: string, durationMs = 1500): void {
    if (this.resultShown) return;
    this.bannerHideEvent?.remove(false);
    this.banner.setText(message).setVisible(true);
    this.bannerHideEvent = this.time.delayedCall(durationMs, () => {
      if (!this.resultShown) this.banner.setVisible(false);
    });
  }

  private showPickupToast(item: ItemStack, sourceTitle: string): void {
    const color = getSupplyColor(item.kind, item.critical);
    const pickupText = this.isAmmoItem(item)
      ? `补充${item.label} +${item.count}\n${sourceTitle}`
      : `获得${item.label} ×${item.count}\n${sourceTitle}`;
    const toast = this.add.text(1010, 164, pickupText, {
      fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
      fontSize: item.critical ? '20px' : '18px',
      color,
      align: 'right',
      backgroundColor: item.critical ? '#281c12dd' : '#10181bdd',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
    }).setDepth(80).setScrollFactor(0).setOrigin(1, 0);

    this.tweens.add({
      targets: toast,
      y: toast.y - 24,
      alpha: 0,
      duration: item.critical ? 1250 : 980,
      ease: 'sine.out',
      onComplete: () => toast.destroy(),
    });

    if (item.critical) {
      this.showBannerMessage(`关键补给回收：${item.label}`, 1600);
    }
  }

  private getNpcMemory(npcName: string): Array<{ speaker: string; content: string }> {
    const existing = this.npcDialogueMemory.get(npcName);
    if (existing) return existing;

    const created: Array<{ speaker: string; content: string }> = [];
    this.npcDialogueMemory.set(npcName, created);
    return created;
  }

  private trimNpcMemory(npcName: string): void {
    const memory = this.getNpcMemory(npcName);
    if (memory.length > 24) {
      memory.splice(0, memory.length - 24);
    }
  }

  private buildPersistentMemory(npcName: string): string {
    const memory = this.getNpcMemory(npcName);
    if (memory.length === 0) {
      return `这是你第一次在“长城被围、守约出城找粮找药”的任务里和玩家深聊。请记住这场围城补给行动的语境，并把之后的对话当成同一场任务里的连续交流。`;
    }

    return memory
      .slice(-8)
      .map((entry) => `${entry.speaker}: ${entry.content}`)
      .join('\n');
  }

  private renderDialogueHistory(history: Array<{ speaker: string; content: string }>): void {
    this.dialogueOverlay?.clear();
    history.forEach((entry) => {
      this.dialogueOverlay?.append({
        speaker: entry.speaker,
        content: entry.content,
        tone: entry.speaker === '你' ? 'player' : 'ally',
      });
    });
  }

  private buildOfflineNpcReply(npc: NpcUnit): string {
    if (npc.name === '花木兰') {
      return `先按任务来。${this.getNpcTacticalHint()}`;
    }
    if (npc.name === '铠') {
      return `别被包。${this.getNpcTacticalHint()}`;
    }
    return `我盯着外线动静。${this.getNpcTacticalHint()}`;
  }

  private async handleDialogueSubmit(message: string): Promise<void> {
    return this.handleDialogueSubmitStream(message);
    if (!this.activeDialogueNpc || !this.dialogueOverlay) return;

    this.dialogueOverlay.append({ speaker: '你', content: message, tone: 'player' });
    this.dialogueHistory.push({ speaker: '你', content: message });
    this.dialogueOverlay.setBusy(true, '角色思考中...');

    try {
      const reply = await requestNpcDialogue({
        npcName: this.activeDialogueNpc.name as '花木兰' | '铠' | '百里玄策',
        persona: this.activeDialogueNpc.persona,
        tacticalHint: this.getNpcTacticalHint(),
        playerMessage: message,
        pressure: this.pressure,
        objectiveCollected: this.objectiveCollected,
        objectiveNeed: this.objectiveNeed,
        history: this.dialogueHistory,
      });
      this.dialogueHistory.push({ speaker: this.activeDialogueNpc.name, content: reply });
      this.dialogueOverlay.append({
        speaker: this.activeDialogueNpc.name,
        content: reply,
        tone: 'ally',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '角色 AI 请求失败';
      this.dialogueOverlay.append({
        speaker: '系统',
        content: `角色 AI 暂时不可用：${message}`,
        tone: 'system',
      });
    } finally {
      this.dialogueOverlay.setBusy(false, this.aiAssistantEnabled ? '已接入长城战场 AI' : '离线对话');
    }
  }

  private async handleDialogueSubmitStream(message: string): Promise<void> {
    if (!this.activeDialogueNpc || !this.dialogueOverlay) return;

    const npcName = this.activeDialogueNpc.name;
    const playerLabel = '你';
    const history = this.getNpcMemory(npcName);

    this.dialogueOverlay.append({ speaker: playerLabel, content: message, tone: 'player' });
    history.push({ speaker: playerLabel, content: message });
    this.trimNpcMemory(npcName);
    this.dialogueHistory = history;

    if (!this.aiAssistantEnabled) {
      this.dialogueOverlay.append({
        speaker: '系统',
        content: '这局没有开启腾讯混元角色对话，所以不会返回固定台词。回到任务准备页打开“腾讯混元角色对话”后再试。',
        tone: 'system',
      });
      this.dialogueOverlay.setBusy(false, '未开启腾讯混元');
      return;
    }

    this.dialogueOverlay.setBusy(true, '角色正在结合战况回复...');

    const streamingId = this.dialogueOverlay.beginStreaming({
      speaker: npcName,
      tone: 'ally',
    });

    try {
      const reply = await requestNpcDialogue(
        {
          npcName: this.activeDialogueNpc.name as '\u82b1\u6728\u5170' | '\u94e0' | '\u767e\u91cc\u7384\u7b56',
          persona: this.activeDialogueNpc.persona,
          tacticalHint: this.getNpcTacticalHint(),
          playerMessage: message,
          pressure: this.pressure,
          objectiveCollected: this.objectiveCollected,
          objectiveNeed: this.objectiveNeed,
          history,
          memory: this.buildPersistentMemory(npcName),
        },
        {
          onChunk: (partial) => {
            this.dialogueOverlay?.updateStreaming(streamingId, partial);
          },
        },
      );

      this.dialogueOverlay.finishStreaming(streamingId, reply);
      history.push({ speaker: npcName, content: reply });
      this.trimNpcMemory(npcName);
    } catch (error) {
      this.dialogueOverlay.finishStreaming(streamingId, '');
      const errorMessage = error instanceof Error ? error.message : '角色 AI 请求失败';
      const hint =
        /missing|401|403|fetch|network/i.test(errorMessage)
          ? ' 请确认 .env.local 已配置好，并且重启过 `npm run dev:local`。'
          : '';
      this.dialogueOverlay.append({
        speaker: '系统',
        content: `角色 AI 暂时不可用：${errorMessage}${hint}`,
        tone: 'system',
      });
    } finally {
      this.dialogueOverlay.setBusy(false, this.aiAssistantEnabled ? '已接入长城战场 AI' : '离线对话');
    }
  }

  private updateUi(): void {
    this.hudTop.setText(
      `生命 ${this.hp}   体力 ${Math.floor(this.stamina)}\n` +
      `敌人数 ${this.enemies.length}   背包格 ${this.itemCount()}/${this.inventoryCap}   关键补给 ${this.objectiveCollected}/${this.objectiveNeed}\n` +
      `行动 ${getModeLabel(this.missionConfig.mode)}   战场AI ${this.aiAssistantEnabled ? '开启' : '关闭'}   当前目标 军粮 / 医疗 / 器械零件`,
    );

    this.hudRisk.setText(this.getContextPrompt());
    const guideHint = this.getNoviceGuideHint();

    if (this.lootPanelOpen && this.activeLoot) {
      this.hudHint.setText('已打开补给整理界面，点击左右列表可在背包与容器间转移物资。关键补给会直接记入任务进度。');
    } else if (this.reloadFinishAt > this.time.now) {
      this.hudHint.setText('正在换弹，暂时无法射击。');
    } else if (this.objectiveCollected < this.objectiveNeed) {
      this.hudHint.setText(
        `${guideHint ? `${guideHint}\n` : ''}` +
        '战场建议：先搜索离城门最近的粮车和药箱，再顺着废墟与沙坡摸到外线军械架。\n' +
        '操作：WASD 移动  Shift 冲刺  左键射击  F 交互  R 换弹  Tab 背包  H 隐藏面板',
      );
    } else {
      this.hudHint.setText('关键补给已经够了，本次外出目标完成。保持警惕，准备把东西带回长城。');
    }

    const cdQ = Math.max(0, Math.ceil((this.skillScanReadyAt - this.time.now) / 1000));
    const cdE = Math.max(0, Math.ceil((this.skillSnipeReadyAt - this.time.now) / 1000));
    const cdSpace = Math.max(0, Math.ceil((this.skillDashReadyAt - this.time.now) / 1000));
    const buff = this.skillSnipeActiveUntil > this.time.now ? '狂风之息：架枪中' : '狂风之息：待命';
    this.skillBoard.setText(
      `状态 ${this.playerVisualState}   技能 ${buff}\n` +
      `冷却 Q ${cdQ}s · E ${cdE}s · Space ${cdSpace}s`,
    );

    this.syncHudVisibility();
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
    const charged = this.skillSnipeActiveUntil > this.time.now;
    const pulse = 0.74 + Math.sin(this.time.now * 0.012) * 0.16;
    this.crosshair.lineStyle(2, charged ? 0xffd58b : 0xe9efe5, 0.95);
    this.crosshair.strokeCircle(p.x, p.y, 11);
    this.crosshair.lineBetween(p.x - 17, p.y, p.x - 6, p.y);
    this.crosshair.lineBetween(p.x + 6, p.y, p.x + 17, p.y);
    this.crosshair.lineBetween(p.x, p.y - 17, p.x, p.y - 6);
    this.crosshair.lineBetween(p.x, p.y + 6, p.x, p.y + 17);
    const camera = this.cameras.main;
    const muzzleOrigin = this.getMuzzleWorldPosition();
    const px = muzzleOrigin.x - camera.worldView.x;
    const py = muzzleOrigin.y - camera.worldView.y;
    if (charged) {
      this.crosshair.lineStyle(7, 0xff5a5a, 0.08 + pulse * 0.06);
      this.crosshair.lineBetween(px, py, p.x, p.y);
      this.crosshair.lineStyle(1.8, 0xff5252, 0.78 + pulse * 0.18);
      this.crosshair.lineBetween(px, py, p.x, p.y);
      this.crosshair.fillStyle(0xff8c8c, 0.72 + pulse * 0.18);
      this.crosshair.fillCircle(px, py, 2.8);
      this.crosshair.lineStyle(2, 0xff8f8f, 0.3 + pulse * 0.18);
      this.crosshair.strokeCircle(p.x, p.y, 18 + pulse * 4);
      this.crosshair.fillStyle(0xff6a6a, 0.12 + pulse * 0.07);
      this.crosshair.fillCircle(p.x, p.y, 8 + pulse * 3);
      this.crosshair.fillStyle(0xffcaca, 0.86);
      this.crosshair.fillCircle(p.x, p.y, 2.2);
    }
    const scanActive = this.scoutEyes.length > 0;
    if (scanActive && !charged) {
      this.crosshair.lineStyle(1.5, 0xff5c5c, 0.75);
      this.crosshair.lineBetween(px, py, p.x, p.y);
    }
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
      npc.label.setDepth(220 + npc.sprite.y);
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
    this.lootTitle.setText(this.activeLoot ? `补给整理 · ${this.activeLoot.title}` : '补给整理');
    this.invHeader.setText(
      `守约背包 ｜ ${this.itemCount()}/${this.inventoryCap} 格 ｜ 物资 ${this.inventoryUnitCount()} 件 ｜ 狙击备用弹 ${this.reserveAmmo.sniper}`,
    );
    this.boxHeader.setText(
      this.activeLoot
        ? `${getSupplyThemeText(this.activeLoot.theme as any)} ｜ ${this.activeLoot.prompt ?? '当前补给点'}`
        : '当前补给点',
    );

    this.inventory.forEach((item, idx) => {
      const text = this.add.text(180, 210 + idx * 34, `${idx + 1}. ${this.describeItemStack(item, 'inventory')}`, {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: '16px',
        color: item.accent ?? getSupplyColor(item.kind, item.critical),
      }).setDepth(62).setScrollFactor(0).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.moveInventoryToBox(idx));
      this.invList.push(text);
    });

    const boxItems = this.activeLoot?.items ?? [];
    boxItems.forEach((item, idx) => {
      const text = this.add.text(720, 210 + idx * 34, `${idx + 1}. ${this.describeItemStack(item, 'box')}`, {
        fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
        fontSize: '16px',
        color: item.accent ?? getSupplyColor(item.kind, item.critical),
      }).setDepth(62).setScrollFactor(0).setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.moveBoxToInventory(idx));
      this.boxList.push(text);
    });

    if (boxItems.length === 0) {
      this.boxList.push(
        this.add.text(720, 210, '这处补给点已经搜空', {
          fontFamily: 'Noto Sans SC, PingFang SC, sans-serif',
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
    this.syncObjectiveProgress();
    this.refreshLootPanel();
  }

  private moveBoxToInventory(index: number): void {
    if (!this.activeLoot) return;
    const item = this.activeLoot.items[index];
    if (!item) return;
    if (!this.canStoreItem(item)) {
      this.hudHint.setText(`背包装不下 ${item.label}，先腾出空格再继续搜。`);
      return;
    }
    this.activeLoot.items.splice(index, 1);
    if (this.isAmmoItem(item)) {
      this.applyAmmoPickup(item);
    } else {
      this.pushItem(this.inventory, item);
    }
    this.syncObjectiveProgress();
    this.showPickupToast(item, this.activeLoot.title);
    this.refreshLootPanel();
  }

  private pushItem(container: ItemStack[], item: ItemStack): void {
    const found = container.find((it) => it.id === item.id);
    if (found) found.count += item.count;
    else container.push({ ...item });
  }

  private applyAmmoPickup(item: ItemStack): void {
    if (item.id === 'sniper_ammo') this.reserveAmmo.sniper += item.count;
  }

  private syncObjectiveProgress(): void {
    const recovered = this.inventory.reduce((acc, item) => {
      if (!isCriticalSupply(item.id)) return acc;
      return acc + item.count;
    }, 0);
    this.objectiveCollected = Math.min(this.objectiveNeed, recovered);
  }

  private itemCount(): number {
    return this.inventory.length;
  }

  private inventoryUnitCount(): number {
    return this.inventory.reduce((acc, it) => acc + it.count, 0);
  }

  private isAmmoItem(item: Pick<ItemStack, 'id'>): boolean {
    return item.id === 'sniper_ammo';
  }

  private canStoreItem(item: ItemStack): boolean {
    if (this.isAmmoItem(item)) return true;
    return this.inventory.some((it) => it.id === item.id) || this.itemCount() < this.inventoryCap;
  }

  private describeItemStack(item: ItemStack, location: 'inventory' | 'box'): string {
    const badge = `【${item.tag ?? '补给'}】`;
    const critical = item.critical ? ' · 关键补给' : '';
    if (location === 'box' && this.isAmmoItem(item)) {
      return `${badge}${item.label} +${item.count}${critical} · 直接补弹`;
    }
    return `${badge}${item.label} ×${item.count}${critical}`;
  }

  private currentWeapon(): WeaponConfig {
    return Object.values(WEAPON_CONFIG)[0];
  }

  private toggleHudVisibility(): void {
    this.hudCollapsed = !this.hudCollapsed;
    this.syncHudVisibility();
  }

  private syncHudVisibility(): void {
    const showDetails = !this.hudCollapsed;
    this.hudDecor.forEach((item) => item.setVisible(showDetails));
    this.hudDetailItems.forEach((item) => item.setVisible(showDetails));
    this.hotbarSlots.forEach((slot) => {
      slot.box.setVisible(showDetails);
      slot.label.setVisible(showDetails);
      slot.ammo.setVisible(showDetails);
    });

    if (this.hudToggleLabel) {
      this.hudToggleLabel.setText(showDetails ? '隐藏 HUD [H]' : '显示 HUD [H]');
    }

    this.hudHint.setPosition(showDetails ? 24 : 20, showDetails ? 146 : 24);
    this.hudHint.setWordWrapWidth(showDetails ? 440 : 320);
    this.hudHint.setStyle({
      backgroundColor: showDetails ? undefined : '#111c1fcc',
      padding: showDetails
        ? { left: 0, right: 0, top: 0, bottom: 0 }
        : { left: 10, right: 10, top: 8, bottom: 8 },
    });
  }




  private isInsideInnerWall(x: number, y: number): boolean {
    return x > FORTRESS_LEFT && x < FORTRESS_RIGHT && y > FORTRESS_TOP && y < FORTRESS_BOTTOM;
  }


  private isInsideGateCorridor(x: number, y: number): boolean {
    return Math.abs(x - GATE_X) < GATE_WIDTH * 0.5 && y > FORTRESS_TOP - 80 && y < FORTRESS_TOP + GATE_INNER_DEPTH;
  }


  private resolveGreatWallBarrier(_body: Phaser.Physics.Arcade.Body): void {
    // Fortress walls now use Phaser static colliders instead of soft push-back.
  }



  private spawnEnemyAtEdge(): void {
    const points = [
      { x: 2080, y: 760 }, { x: 2440, y: 860 }, { x: 2880, y: 700 },
      { x: 3240, y: 1020 }, { x: 3540, y: 1460 }, { x: 3820, y: 1780 },
      { x: 3380, y: 2120 }, { x: 2600, y: 1980 },
    ];
    for (let i = 0; i < 16; i += 1) {
      const point = points[Phaser.Math.Between(0, points.length - 1)];
      const x = point.x + Phaser.Math.Between(-80, 80);
      const y = point.y + Phaser.Math.Between(-80, 80);
      if (this.isInsideInnerWall(x, y)) continue;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 420) continue;
      this.spawnEnemy(x, y, Math.random() < (this.missionConfig.mode === 'pressure' ? 0.4 : 0.3) ? 'elite' : 'grunt');
      return;
    }
    this.spawnEnemy(2880, 980, 'elite');
  }


  private dropEnemyLoot(enemy: EnemyUnit): void {
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    const shadow = this.add.ellipse(x, y + 10, 20, 8, 0x000000, 0.22).setDepth(2);
    const themeKey =
      enemy.kind === 'boss'
        ? 'ammo_crate_model'
        : enemy.kind === 'elite'
          ? 'tool_box_model'
          : 'part_model';
    const sprite = this.add.sprite(x, y, themeKey).setDepth(6);
    const items =
      enemy.kind === 'boss'
        ? buildSupplyItems([
            { id: 'ballista_part', count: 1 },
            { id: 'sniper_ammo', count: 2 },
            { id: 'guard_med_crate', count: 1 },
          ])
        : enemy.kind === 'elite'
          ? buildSupplyItems([
              { id: 'ration_pack', count: 1 },
              { id: 'tool_kit', count: 1 },
            ])
          : buildSupplyItems([
              { id: Phaser.Math.Between(0, 1) === 0 ? 'sniper_ammo' : 'herbal_pouch', count: 1 },
            ]);
    const crate: LootContainer = {
      sprite,
      shadow,
      title: enemy.kind === 'boss' ? '高危魔种军需残包' : enemy.kind === 'elite' ? '精英魔种掠夺包' : '魔种残骸',
      opened: false,
      theme: enemy.kind === 'boss' ? 'ordnance' : enemy.kind === 'elite' ? 'survival' : 'raided',
      prompt: enemy.kind === 'boss' ? '回收高价值军需' : '检查残存补给',
      hint: enemy.kind === 'boss' ? '可能有器械零件和医疗包' : '也许还剩点能用的东西',
      items,
    };
    this.lootContainers.push(crate);
  }


  private checkWinLose(): void {
    if (this.hp <= 0) {
      this.showResult(MISSION_FAILURE_TEXT);
      return;
    }
    if (this.objectiveCollected >= this.objectiveNeed) {
      this.showResult(getMissionSuccessText(this.objectiveCollected));
    }
  }

  private showResult(message: string): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.bannerHideEvent?.remove(false);
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
