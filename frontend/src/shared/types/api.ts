export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput;

export type AssetType =
  | 'CRYPTO'
  | 'BANK_ACCOUNT'
  | 'CASH'
  | 'VEHICLE'
  | 'REAL_ESTATE'
  | 'PRECIOUS_METAL'
  | 'SECURITIES'
  | 'BUSINESS'
  | 'COLLECTIBLE'
  | 'OTHER';
export type AssetCredentialProvider = 'BINANCE' | 'BLOCKSCAN' | 'MONOBANK';

export type AssetCredentialView = {
  provider: AssetCredentialProvider;
  externalIdentifier?: string | null;
  tokenDecimals?: number | null;
  hasStoredKey?: boolean;
  hasStoredSecret?: boolean;
};

export type Asset = {
  id: string;
  type: AssetType;
  name: string;
  balance: number;
  currency: string;
  isAuto: boolean;
  updatedAt: string;
  credential?: AssetCredentialView | null;
};

export type CreateAssetInput = {
  type: AssetType;
  name: string;
  balance: number;
  currency: string;
  isAuto: boolean;
  credential?: {
    provider: AssetCredentialProvider;
    apiKey?: string;
    apiSecret?: string;
    externalId?: string;
    tokenDecimals?: number;
    keepExistingKey?: boolean;
    keepExistingSecret?: boolean;
  };
};

export type DeleteResponse = {
  success: boolean;
  message: string;
};

export type HealthResponse = {
  status: string;
  service: string;
};

export type RefreshAllResponse = {
  total: number;
  refreshed: number;
  failed: number;
  errors: Array<{
    assetId: string;
    reason: string;
  }>;
};

export type NetWorthItem = {
  id: string;
  name: string;
  type: AssetType;
  currency: string;
  balance: number;
  rateToUah: number;
  valueUah: number;
  updatedAt: string;
};

export type NetWorthResponse = {
  currency: 'UAH';
  totalUah: number;
  items: NetWorthItem[];
};

export type DistributionItem = {
  type: AssetType;
  valueUah: number;
  percentage: number;
};

export type HistoryPoint = {
  date: string;
  deltaUah: number;
  totalUah: number;
};

export type CurrencyRate = {
  code: string;
  rateToUah: number;
  source: string;
  updatedAt: string;
};
