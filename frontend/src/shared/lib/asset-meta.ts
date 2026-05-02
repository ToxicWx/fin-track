import type { AssetCredentialProvider, AssetType } from '../types/api';

export const assetTypeMeta: Record<
  AssetType,
  { label: string; icon: string; group: 'movable' | 'immovable' | 'financial' | 'digital' | 'other' }
> = {
  CRYPTO: {
    label: 'Crypto asset',
    icon: '◈',
    group: 'digital',
  },
  BANK_ACCOUNT: {
    label: 'Bank account',
    icon: '▣',
    group: 'financial',
  },
  CASH: {
    label: 'Cash',
    icon: '◍',
    group: 'financial',
  },
  VEHICLE: {
    label: 'Vehicle',
    icon: '◆',
    group: 'movable',
  },
  REAL_ESTATE: {
    label: 'Real estate',
    icon: '▤',
    group: 'immovable',
  },
  PRECIOUS_METAL: {
    label: 'Precious metal',
    icon: '⬢',
    group: 'financial',
  },
  SECURITIES: {
    label: 'Securities',
    icon: '◫',
    group: 'financial',
  },
  BUSINESS: {
    label: 'Business / equity',
    icon: '◩',
    group: 'other',
  },
  COLLECTIBLE: {
    label: 'Collectible',
    icon: '◎',
    group: 'movable',
  },
  OTHER: {
    label: 'Other asset',
    icon: '○',
    group: 'other',
  },
};

export const providerMeta: Record<
  AssetCredentialProvider,
  { label: string; icon: string; description: string }
> = {
  BINANCE: {
    label: 'Binance',
    icon: 'BN',
    description: 'Exchange-based crypto balances and market pricing',
  },
  MONOBANK: {
    label: 'Monobank',
    icon: 'MO',
    description: 'Bank account and transaction synchronization',
  },
  BLOCKSCAN: {
    label: 'Blockscan',
    icon: 'BC',
    description: 'On-chain wallet and token balances for EVM networks',
  },
};

export function getAssetTypeLabel(type: AssetType) {
  return assetTypeMeta[type].label;
}

export function getAssetTypeIcon(type: AssetType) {
  return assetTypeMeta[type].icon;
}
