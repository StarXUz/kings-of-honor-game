export type SupplyKind = 'food' | 'medical' | 'survival' | 'ordnance';
export type SupplyTheme = 'grain' | 'medical' | 'survival' | 'ordnance' | 'raided';

export interface SupplyItemRuntime {
  id: string;
  label: string;
  kind: SupplyKind;
  count: number;
  critical: boolean;
  tag: string;
  icon: string;
  accent: string;
}

type SupplyItemMeta = Omit<SupplyItemRuntime, 'count'>;

type SupplyEntry = {
  id: keyof typeof SUPPLY_ITEMS;
  count: number;
};

export interface SupplyCacheLayout {
  x: number;
  y: number;
  title: string;
  theme: SupplyTheme;
  prompt: string;
  items: SupplyEntry[];
}

export const SUPPLY_ITEMS = {
  grain_sack: {
    id: 'grain_sack',
    label: '军粮袋',
    kind: 'food',
    critical: true,
    tag: '军粮',
    icon: '粮',
    accent: '#d9b166',
  },
  ration_pack: {
    id: 'ration_pack',
    label: '应急口粮',
    kind: 'food',
    critical: true,
    tag: '口粮',
    icon: '粮',
    accent: '#d8c27d',
  },
  dried_meat: {
    id: 'dried_meat',
    label: '肉干',
    kind: 'food',
    critical: false,
    tag: '食物',
    icon: '食',
    accent: '#b98f63',
  },
  guard_med_crate: {
    id: 'guard_med_crate',
    label: '守城医疗包',
    kind: 'medical',
    critical: true,
    tag: '医疗',
    icon: '医',
    accent: '#7fcdb7',
  },
  bandage_roll: {
    id: 'bandage_roll',
    label: '绷带卷',
    kind: 'medical',
    critical: false,
    tag: '药材',
    icon: '药',
    accent: '#9edfd0',
  },
  herbal_pouch: {
    id: 'herbal_pouch',
    label: '草药包',
    kind: 'medical',
    critical: false,
    tag: '草药',
    icon: '药',
    accent: '#86c8a5',
  },
  clean_water: {
    id: 'clean_water',
    label: '净水壶',
    kind: 'survival',
    critical: false,
    tag: '净水',
    icon: '水',
    accent: '#87b7d8',
  },
  tinder_kit: {
    id: 'tinder_kit',
    label: '火种包',
    kind: 'survival',
    critical: false,
    tag: '火种',
    icon: '火',
    accent: '#d38b62',
  },
  tool_kit: {
    id: 'tool_kit',
    label: '小型工具包',
    kind: 'survival',
    critical: false,
    tag: '工具',
    icon: '工',
    accent: '#96a6bf',
  },
  sniper_ammo: {
    id: 'sniper_ammo',
    label: '狙击专用弹',
    kind: 'ordnance',
    critical: false,
    tag: '军需',
    icon: '弹',
    accent: '#d9a86d',
  },
  arrow_bundle: {
    id: 'arrow_bundle',
    label: '箭矢束',
    kind: 'ordnance',
    critical: false,
    tag: '军需',
    icon: '箭',
    accent: '#c79f5c',
  },
  ballista_part: {
    id: 'ballista_part',
    label: '守城器械零件',
    kind: 'ordnance',
    critical: true,
    tag: '零件',
    icon: '械',
    accent: '#c8b07d',
  },
} satisfies Record<string, SupplyItemMeta>;

export const SUPPLY_CACHE_LAYOUT: SupplyCacheLayout[] = [
  {
    x: 1940,
    y: 1500,
    title: '废弃粮车',
    theme: 'grain',
    prompt: '翻找粮袋与口粮',
    items: [
      { id: 'grain_sack', count: 1 },
      { id: 'ration_pack', count: 1 },
      { id: 'dried_meat', count: 2 },
    ],
  },
  {
    x: 2320,
    y: 1180,
    title: '前线药箱堆',
    theme: 'medical',
    prompt: '搜药箱和急救包',
    items: [
      { id: 'guard_med_crate', count: 1 },
      { id: 'bandage_roll', count: 2 },
      { id: 'herbal_pouch', count: 1 },
    ],
  },
  {
    x: 2760,
    y: 920,
    title: '断裂军械架',
    theme: 'ordnance',
    prompt: '收拢器械零件和弹药',
    items: [
      { id: 'ballista_part', count: 1 },
      { id: 'sniper_ammo', count: 3 },
      { id: 'arrow_bundle', count: 1 },
    ],
  },
  {
    x: 3200,
    y: 1380,
    title: '倒塌帐篷补给',
    theme: 'survival',
    prompt: '检查净水和火种',
    items: [
      { id: 'ration_pack', count: 1 },
      { id: 'clean_water', count: 1 },
      { id: 'tinder_kit', count: 1 },
    ],
  },
  {
    x: 3540,
    y: 1780,
    title: '被洗劫的补给站',
    theme: 'raided',
    prompt: '回收残存药品和工具',
    items: [
      { id: 'guard_med_crate', count: 1 },
      { id: 'tool_kit', count: 1 },
      { id: 'sniper_ammo', count: 2 },
    ],
  },
];

export function buildSupplyItems(entries: SupplyEntry[]): SupplyItemRuntime[] {
  return entries.map((entry) => ({
    ...SUPPLY_ITEMS[entry.id],
    count: entry.count,
  }));
}

export function getSupplyItem(id: string): SupplyItemMeta | undefined {
  return SUPPLY_ITEMS[id as keyof typeof SUPPLY_ITEMS];
}

export function isCriticalSupply(id: string): boolean {
  return Boolean(getSupplyItem(id)?.critical);
}

export function getSupplyThemeText(theme: SupplyTheme): string {
  if (theme === 'grain') return '粮车';
  if (theme === 'medical') return '药箱';
  if (theme === 'survival') return '生存';
  if (theme === 'ordnance') return '军械';
  return '残存';
}

export function getSupplyColor(kind: SupplyKind, critical = false): string {
  if (critical && kind === 'food') return '#f0d28c';
  if (critical && kind === 'medical') return '#8be1c7';
  if (critical && kind === 'ordnance') return '#e6c98f';
  if (kind === 'food') return '#d0ae6e';
  if (kind === 'medical') return '#96d7c4';
  if (kind === 'survival') return '#8db4da';
  return '#cfab79';
}

export function getSupplyPrompt(itemIds: string[]): string {
  const criticals = itemIds
    .map((id) => getSupplyItem(id))
    .filter((item): item is SupplyItemMeta => Boolean(item?.critical))
    .map((item) => item.label);

  if (criticals.length === 0) {
    return '搜集可用补给';
  }

  return `重点补给：${criticals.join(' / ')}`;
}
