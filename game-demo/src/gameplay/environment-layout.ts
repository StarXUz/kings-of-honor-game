export interface LayoutPoint {
  x: number;
  y: number;
}

export interface BattlefieldZone {
  id: 'safe' | 'frontline' | 'danger' | 'resource' | 'return-route';
  label: string;
  note: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
}

export interface BattlefieldProp {
  kind:
    | 'banner'
    | 'brazier'
    | 'cheval'
    | 'wreck'
    | 'rack'
    | 'crack'
    | 'rubble'
    | 'tower'
    | 'supply'
    | 'wall'
    | 'sand';
  x: number;
  y: number;
  scale?: number;
  tint?: number;
  angle?: number;
  flipX?: boolean;
  depth?: number;
}

export const BATTLEFIELD_ZONES: BattlefieldZone[] = [
  {
    id: 'safe',
    label: '长城内侧安全区',
    note: '守军整备、伤员安置、队友会合',
    x: 860,
    y: 2070,
    width: 1180,
    height: 540,
    color: 0x33574f,
    alpha: 0.15,
  },
  {
    id: 'frontline',
    label: '城门前线',
    note: '主防线、支援会合点、短兵交火区',
    x: 1060,
    y: 1560,
    width: 980,
    height: 300,
    color: 0xb17a42,
    alpha: 0.12,
  },
  {
    id: 'danger',
    label: '魔种高压区',
    note: '精英怪压迫更强，冲锋与扑击更危险',
    x: 3010,
    y: 1180,
    width: 1640,
    height: 900,
    color: 0x7a2c23,
    alpha: 0.12,
  },
  {
    id: 'resource',
    label: '外围补给区',
    note: '废弃粮车、药箱堆、军械散点',
    x: 2450,
    y: 1520,
    width: 1680,
    height: 760,
    color: 0x80613d,
    alpha: 0.08,
  },
  {
    id: 'return-route',
    label: '回城路线',
    note: '关键物资凑够后，建议沿遮蔽物回城',
    x: 1460,
    y: 1960,
    width: 760,
    height: 420,
    color: 0x476d62,
    alpha: 0.1,
  },
];

export const NPC_PATROL_ROUTES: Record<'花木兰' | '铠' | '百里玄策', LayoutPoint[]> = {
  花木兰: [
    { x: 560, y: 1980 },
    { x: 760, y: 1900 },
    { x: 930, y: 1860 },
    { x: 1080, y: 1930 },
    { x: 820, y: 2040 },
  ],
  铠: [
    { x: 780, y: 1770 },
    { x: 980, y: 1680 },
    { x: 1180, y: 1730 },
    { x: 1320, y: 1840 },
    { x: 1060, y: 1900 },
  ],
  百里玄策: [
    { x: 1260, y: 1760 },
    { x: 1520, y: 1600 },
    { x: 1780, y: 1460 },
    { x: 2060, y: 1560 },
    { x: 1860, y: 1820 },
    { x: 1500, y: 1930 },
  ],
};

export const BATTLEFIELD_PROPS: BattlefieldProp[] = [
  { kind: 'banner', x: 760, y: 1700, scale: 1.08, tint: 0xa44f42 },
  { kind: 'banner', x: 1180, y: 1710, scale: 0.96, tint: 0x9d5846, flipX: true },
  { kind: 'brazier', x: 612, y: 1812, scale: 1.02, tint: 0xf0a55c },
  { kind: 'brazier', x: 1254, y: 1786, scale: 1.02, tint: 0xf0a55c },
  { kind: 'cheval', x: 1530, y: 1660, scale: 1.15, tint: 0x7a5a41, angle: -6 },
  { kind: 'cheval', x: 1710, y: 1570, scale: 1.08, tint: 0x775640, angle: 8 },
  { kind: 'wall', x: 1850, y: 1450, scale: 1.18, tint: 0x775f49, angle: -4 },
  { kind: 'wall', x: 2035, y: 1355, scale: 1.16, tint: 0x73583f, angle: 6 },
  { kind: 'rack', x: 910, y: 2140, scale: 1.02, tint: 0x8d6948 },
  { kind: 'rack', x: 1180, y: 2200, scale: 1.06, tint: 0x896648 },
  { kind: 'supply', x: 2140, y: 1490, scale: 1.04, tint: 0xaf7f4d },
  { kind: 'supply', x: 2520, y: 1310, scale: 1.06, tint: 0xb18352 },
  { kind: 'supply', x: 3190, y: 1380, scale: 1.08, tint: 0xae7c4b },
  { kind: 'wreck', x: 2420, y: 1120, scale: 1.2, tint: 0x6a4a38, angle: -18 },
  { kind: 'wreck', x: 3350, y: 1670, scale: 1.26, tint: 0x6f4c37, angle: 12 },
  { kind: 'tower', x: 2080, y: 830, scale: 1.12, tint: 0x775f45 },
  { kind: 'tower', x: 3160, y: 932, scale: 1.16, tint: 0x775f45 },
  { kind: 'rubble', x: 2660, y: 1160, scale: 1.1, tint: 0x7f654d },
  { kind: 'rubble', x: 2880, y: 1820, scale: 1.18, tint: 0x745d48 },
  { kind: 'crack', x: 1730, y: 1510, scale: 1.1, tint: 0x4b3626, angle: 18 },
  { kind: 'crack', x: 2320, y: 1260, scale: 1.2, tint: 0x4b3626, angle: -8 },
  { kind: 'crack', x: 3520, y: 1880, scale: 1.3, tint: 0x4b3626, angle: 5 },
  { kind: 'sand', x: 2250, y: 1700, scale: 1.3, tint: 0xd3a567 },
  { kind: 'sand', x: 2970, y: 1480, scale: 1.46, tint: 0xcd9b5f },
  { kind: 'sand', x: 3660, y: 2060, scale: 1.24, tint: 0xc79155 },
];

export const TACTICAL_ROUTE_MARKERS = [
  { x: 1480, y: 1660, label: '主防线缺口', color: 0xd8b072 },
  { x: 2220, y: 1450, label: '补给推进线', color: 0xba9155 },
  { x: 3180, y: 1280, label: '精英怪压力区', color: 0xb8665a },
  { x: 1080, y: 2010, label: '回城整备线', color: 0x7bc6b0 },
];
