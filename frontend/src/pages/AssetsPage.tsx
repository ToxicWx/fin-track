import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '../shared/api/assets';
import { QueryState } from '../shared/components/QueryState';
import { SectionCard } from '../shared/components/SectionCard';
import { StatCard } from '../shared/components/StatCard';
import { Badge } from '../shared/components/ui/Badge';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { Modal } from '../shared/components/ui/Modal';
import { Select } from '../shared/components/ui/Select';
import { useToast } from '../shared/components/ui/use-toast';
import { assetTypeMeta, getAssetTypeLabel, providerMeta } from '../shared/lib/asset-meta';
import { getApiErrorMessage } from '../shared/lib/api-errors';
import { formatDateTime } from '../shared/lib/format';
import type {
  Asset,
  AssetCredentialProvider,
  AssetType,
  CreateAssetInput,
} from '../shared/types/api';

const assetTypes: AssetType[] = [
  'REAL_ESTATE',
  'VEHICLE',
  'BANK_ACCOUNT',
  'CASH',
  'SECURITIES',
  'PRECIOUS_METAL',
  'BUSINESS',
  'COLLECTIBLE',
  'CRYPTO',
  'OTHER',
];

const providers: AssetCredentialProvider[] = ['BINANCE', 'BLOCKSCAN', 'MONOBANK'];

type AssetFormState = {
  type: AssetType;
  name: string;
  balance: string;
  currency: string;
  isAuto: boolean;
  provider: AssetCredentialProvider | '';
  apiKey: string;
  apiSecret: string;
  externalId: string;
  tokenDecimals: string;
  keepExistingKey: boolean;
  keepExistingSecret: boolean;
};

type SortMode = 'updated-desc' | 'value-asc' | 'value-desc' | 'name-asc';

const initialFormState: AssetFormState = {
  type: 'CASH',
  name: '',
  balance: '0',
  currency: 'UAH',
  isAuto: false,
  provider: '',
  apiKey: '',
  apiSecret: '',
  externalId: '',
  tokenDecimals: '',
  keepExistingKey: false,
  keepExistingSecret: false,
};

export function AssetsPage() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [form, setForm] = useState<AssetFormState>(initialFormState);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AssetType>('ALL');
  const [providerFilter, setProviderFilter] = useState<'ALL' | AssetCredentialProvider | 'MANUAL'>('ALL');
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'movable' | 'immovable' | 'financial' | 'digital' | 'other'>('ALL');
  const [autoOnly, setAutoOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc');
  const [deleteCandidate, setDeleteCandidate] = useState<Asset | null>(null);

  const deferredSearch = useDeferredValue(search);

  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: assetsApi.getAssets,
  });

  const invalidateData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['net-worth'] }),
      queryClient.invalidateQueries({ queryKey: ['distribution'] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: assetsApi.createAsset,
    onSuccess: async () => {
      resetForm();
      pushToast({
        tone: 'success',
        title: 'Asset created',
        description: 'New asset added.',
      });
      await invalidateData();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, 'Failed to create asset.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAssetInput> }) =>
      assetsApi.updateAsset(id, payload),
    onSuccess: async () => {
      resetForm();
      pushToast({
        tone: 'success',
        title: 'Asset updated',
        description: 'Changes saved.',
      });
      await invalidateData();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, 'Failed to update asset.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: assetsApi.deleteAsset,
    onSuccess: async () => {
      setDeleteCandidate(null);
      setActionError('');
      pushToast({
        tone: 'success',
        title: 'Asset deleted',
        description: 'Asset removed.',
      });
      await invalidateData();
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Failed to delete asset.'));
    },
  });

  const refreshMutation = useMutation({
    mutationFn: assetsApi.refreshAsset,
    onSuccess: async (asset) => {
      setActionError('');
      pushToast({
        tone: 'success',
        title: 'Refresh completed',
        description: `${asset.name}: ${asset.balance} ${asset.currency}`,
      });
      await invalidateData();
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Failed to refresh asset.'));
    },
  });

  const refreshAllMutation = useMutation({
    mutationFn: assetsApi.refreshAllAssets,
    onSuccess: async (result) => {
      pushToast({
        tone: result.failed === 0 ? 'success' : 'warning',
        title: 'Refresh finished',
        description: `Updated ${result.refreshed} of ${result.total}`,
      });
      await invalidateData();
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Failed to run bulk refresh.'));
    },
  });

  const filteredAssets = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return [...(assetsQuery.data ?? [])]
      .filter((asset) => {
        if (typeFilter !== 'ALL' && asset.type !== typeFilter) {
          return false;
        }

        if (groupFilter !== 'ALL' && assetTypeMeta[asset.type].group !== groupFilter) {
          return false;
        }

        if (providerFilter === 'MANUAL' && asset.credential?.provider) {
          return false;
        }

        if (
          providerFilter !== 'ALL' &&
          providerFilter !== 'MANUAL' &&
          asset.credential?.provider !== providerFilter
        ) {
          return false;
        }

        if (autoOnly && !asset.isAuto) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          asset.name.toLowerCase().includes(normalizedSearch) ||
          asset.currency.toLowerCase().includes(normalizedSearch) ||
          getAssetTypeLabel(asset.type).toLowerCase().includes(normalizedSearch) ||
          (asset.credential?.provider ?? 'manual').toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        if (sortMode === 'name-asc') {
          return left.name.localeCompare(right.name, 'en');
        }

        if (sortMode === 'value-asc') {
          return left.balance - right.balance;
        }

        if (sortMode === 'value-desc') {
          return right.balance - left.balance;
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [assetsQuery.data, autoOnly, deferredSearch, groupFilter, providerFilter, sortMode, typeFilter]);

  const metrics = useMemo(() => {
    const assets = assetsQuery.data ?? [];

    return {
      total: assets.length,
      auto: assets.filter((asset) => asset.isAuto).length,
      movable: assets.filter((asset) => assetTypeMeta[asset.type].group === 'movable').length,
      immovable: assets.filter((asset) => assetTypeMeta[asset.type].group === 'immovable').length,
    };
  }, [assetsQuery.data]);

  const providerHint = useMemo(() => {
    if (form.provider === 'BINANCE') {
      return 'One Binance asset equals one specific exchange symbol, for example BTC, ETH, LTC, or USDT.';
    }

    if (form.provider === 'MONOBANK') {
      return 'For Monobank, provide a personal token. External ID can be used as the account id.';
    }

    if (form.provider === 'BLOCKSCAN') {
      return 'For native ETH, the wallet address is enough. For ERC-20 tokens, add the contract address and token decimals.';
    }

    return 'Manual assets work well for property, vehicles, cash, businesses, and other offline holdings.';
  }, [form.provider]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Enter an asset name.');
      return;
    }

    const credential = form.provider
      ? {
          provider: form.provider,
          apiKey: form.apiKey.trim() || undefined,
          apiSecret: form.apiSecret.trim() || undefined,
          externalId: form.externalId.trim() || undefined,
          tokenDecimals: form.tokenDecimals ? Number(form.tokenDecimals) : undefined,
          keepExistingKey: editingAsset?.credential?.hasStoredKey ? form.keepExistingKey : undefined,
          keepExistingSecret: editingAsset?.credential?.hasStoredSecret
            ? form.keepExistingSecret
            : undefined,
        }
      : undefined;

    const payload: CreateAssetInput = {
      type: form.type,
      name: form.name.trim(),
      balance: Number(form.balance),
      currency: form.currency.trim().toUpperCase(),
      isAuto: form.isAuto,
      credential,
    };

    if (editingAsset) {
      await updateMutation.mutateAsync({ id: editingAsset.id, payload });
      return;
    }

    if (payload.credential && !payload.credential.apiKey) {
      setFormError('A key or token is required for a new integrated asset.');
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const startEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      type: asset.type,
      name: asset.name,
      balance: String(asset.balance),
      currency: asset.currency,
      isAuto: asset.isAuto,
      provider: asset.credential?.provider ?? '',
      apiKey: '',
      apiSecret: '',
      externalId: asset.credential?.externalIdentifier ?? '',
      tokenDecimals: asset.credential?.tokenDecimals ? String(asset.credential.tokenDecimals) : '',
      keepExistingKey: Boolean(asset.credential?.hasStoredKey),
      keepExistingSecret: Boolean(asset.credential?.hasStoredSecret),
    });
    setFormError('');
    setActionError('');
  };

  const resetForm = () => {
    setEditingAsset(null);
    setForm(initialFormState);
    setFormError('');
    setActionError('');
  };

  return (
    <div className="page-stack page-stack--wide">
      <section className="hero-panel hero-panel--thin">
        <div className="hero-copy">
          <div className="eyebrow">Assets</div>
          <h1>Assets and property</h1>
          <p>
            Here you can add, edit and delete assets. Both manual records and connected services
            are supported.
          </p>
          <div className="hero-actions">
            <Button
              variant="secondary"
              isLoading={refreshAllMutation.isPending}
              onClick={() => void refreshAllMutation.mutateAsync()}
            >
              Refresh all auto assets
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Clear form
            </Button>
          </div>
        </div>
      </section>

      <div className="stats-grid stats-grid--four">
        <StatCard label="Total" value={String(metrics.total)} caption="All items" />
        <StatCard label="Auto" value={String(metrics.auto)} caption="Auto-updated items" />
        <StatCard label="Movable" value={String(metrics.movable)} caption="Vehicles and collectibles" />
        <StatCard label="Immovable" value={String(metrics.immovable)} caption="Apartments, houses, land" />
      </div>

      <div className="assets-layout">
        <SectionCard
          title={editingAsset ? 'Edit asset' : 'Create asset'}
          subtitle="Form for adding and editing assets"
        >
          <form className="asset-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <Select
                label="Asset type"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value as AssetType }))
                }
                options={assetTypes.map((type) => ({
                  label: `${assetTypeMeta[type].icon} ${assetTypeMeta[type].label}`,
                  value: type,
                }))}
              />
              <Input
                label="Name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Example: City apartment / Binance LTC"
              />
              <Input
                label="Valuation / balance"
                type="number"
                step="0.0001"
                value={form.balance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, balance: event.target.value }))
                }
              />
              <Input
                label="Currency"
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                }
                placeholder="UAH / USD / EUR / BTC"
              />
              <Select
                label="Provider"
                value={form.provider}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    provider: event.target.value as AssetCredentialProvider | '',
                  }))
                }
                options={[
                  { label: 'No integration', value: '' },
                  ...providers.map((provider) => ({
                    label: `${providerMeta[provider].icon} ${providerMeta[provider].label}`,
                    value: provider,
                  })),
                ]}
              />
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isAuto}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isAuto: event.target.checked }))
                  }
                />
                <span>Automatic refresh</span>
              </label>
            </div>

            <div className="integration-tip">
              <Badge tone={form.provider ? 'accent' : 'neutral'}>
                {form.provider || assetTypeMeta[form.type].group.toUpperCase()}
              </Badge>
              <p>{providerHint}</p>
            </div>

            {form.provider ? (
              <div className="integration-box">
                <h3>Credentials</h3>
                <div className="form-grid">
                  <Input
                    label={form.provider === 'BLOCKSCAN' ? 'Wallet address' : 'API key / token'}
                    value={form.apiKey}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        apiKey: event.target.value,
                        keepExistingKey: false,
                      }))
                    }
                    placeholder={
                      editingAsset?.credential?.hasStoredKey
                        ? 'Enter a new value only if you want to replace the current one'
                        : 'Enter key or token'
                    }
                  />

                  {form.provider === 'BINANCE' ? (
                    <Input
                      label="API secret"
                      value={form.apiSecret}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          apiSecret: event.target.value,
                          keepExistingSecret: false,
                        }))
                      }
                      placeholder={
                        editingAsset?.credential?.hasStoredSecret
                          ? 'Leave empty if the secret is already stored'
                          : 'Binance API secret'
                      }
                    />
                  ) : null}

                  <Input
                    label="External ID / account / contract"
                    value={form.externalId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, externalId: event.target.value }))
                    }
                    placeholder="Optional"
                  />

                  {form.provider === 'BLOCKSCAN' ? (
                    <Input
                      label="Token decimals"
                      type="number"
                      value={form.tokenDecimals}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, tokenDecimals: event.target.value }))
                      }
                      placeholder="Example: 6 or 18"
                    />
                  ) : null}
                </div>

                {editingAsset?.credential?.hasStoredKey ? (
                  <label className="checkbox-field checkbox-field--compact">
                    <input
                      type="checkbox"
                      checked={form.keepExistingKey}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, keepExistingKey: event.target.checked }))
                      }
                    />
                    <span>Keep current key / token</span>
                  </label>
                ) : null}

                {form.provider === 'BINANCE' && editingAsset?.credential?.hasStoredSecret ? (
                  <label className="checkbox-field checkbox-field--compact">
                    <input
                      type="checkbox"
                      checked={form.keepExistingSecret}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          keepExistingSecret: event.target.checked,
                        }))
                      }
                    />
                    <span>Keep current secret</span>
                  </label>
                ) : null}
              </div>
            ) : null}

            {formError ? <div className="form-error">{formError}</div> : null}
            {actionError ? <div className="form-error">{actionError}</div> : null}

            <div className="form-actions">
              <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                {editingAsset ? 'Update asset' : 'Add asset'}
              </Button>
              {editingAsset ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel editing
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <div className="page-stack">
          <SectionCard
            title="Filters and navigation"
            subtitle="Browse property groups, search, and sorting"
          >
            <div className="filters-grid">
              <Input
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, type, currency, provider"
              />
              <Select
                label="Type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | AssetType)}
                options={[
                  { label: 'All types', value: 'ALL' },
                  ...assetTypes.map((type) => ({
                    label: assetTypeMeta[type].label,
                    value: type,
                  })),
                ]}
              />
              <Select
                label="Asset group"
                value={groupFilter}
                onChange={(event) =>
                  setGroupFilter(
                    event.target.value as
                      | 'ALL'
                      | 'movable'
                      | 'immovable'
                      | 'financial'
                      | 'digital'
                      | 'other',
                  )
                }
                options={[
                  { label: 'All groups', value: 'ALL' },
                  { label: 'Movable', value: 'movable' },
                  { label: 'Immovable', value: 'immovable' },
                  { label: 'Financial', value: 'financial' },
                  { label: 'Digital', value: 'digital' },
                  { label: 'Other', value: 'other' },
                ]}
              />
              <Select
                label="Provider"
                value={providerFilter}
                onChange={(event) =>
                  setProviderFilter(
                    event.target.value as 'ALL' | AssetCredentialProvider | 'MANUAL',
                  )
                }
                options={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Manual', value: 'MANUAL' },
                  ...providers.map((provider) => ({
                    label: providerMeta[provider].label,
                    value: provider,
                  })),
                ]}
              />
              <Select
                label="Sorting"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                options={[
                  { label: 'Recently updated first', value: 'updated-desc' },
                  { label: 'Balance ascending', value: 'value-asc' },
                  { label: 'Balance descending', value: 'value-desc' },
                  { label: 'Name A-Z', value: 'name-asc' },
                ]}
              />
              <label className="checkbox-field checkbox-field--compact">
                <input
                  type="checkbox"
                  checked={autoOnly}
                  onChange={(event) => setAutoOnly(event.target.checked)}
                />
                <span>Auto assets only</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title={`Asset catalog (${filteredAssets.length})`}
            subtitle="All saved assets"
          >
            <QueryState query={assetsQuery}>
              {filteredAssets.length > 0 ? (
                <div className="asset-list">
                  {filteredAssets.map((asset) => (
                    <article key={asset.id} className="asset-card asset-card--rich">
                      <div className="asset-card__header">
                        <div>
                          <div className="asset-card__title-row">
                            <div className="asset-card__title">
                              {assetTypeMeta[asset.type].icon} {asset.name}
                            </div>
                            <Badge tone={asset.isAuto ? 'success' : 'neutral'}>
                              {asset.isAuto ? 'AUTO' : 'MANUAL'}
                            </Badge>
                            <Badge tone={asset.credential?.provider ? 'accent' : 'neutral'}>
                              {asset.credential?.provider ?? assetTypeMeta[asset.type].group}
                            </Badge>
                          </div>
                          <div className="asset-card__meta">
                            {assetTypeMeta[asset.type].label} | {asset.currency} | updated{' '}
                            {formatDateTime(asset.updatedAt)}
                          </div>
                        </div>
                        <div className="asset-balance">
                          {asset.balance} {asset.currency}
                        </div>
                      </div>

                      <div className="asset-card__details">
                        <span>Type: {getAssetTypeLabel(asset.type)}</span>
                        {asset.credential?.externalIdentifier ? (
                          <span>External ID: {asset.credential.externalIdentifier}</span>
                        ) : null}
                        {asset.credential?.hasStoredKey ? <span>Key stored</span> : null}
                        {asset.credential?.hasStoredSecret ? <span>Secret stored</span> : null}
                      </div>

                      <div className="asset-card__footer">
                        <Button variant="ghost" onClick={() => startEdit(asset)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          isLoading={refreshMutation.isPending}
                          onClick={() => void refreshMutation.mutateAsync(asset.id)}
                        >
                          Refresh
                        </Button>
                        <Button
                          variant="danger"
                          isLoading={deleteMutation.isPending && deleteCandidate?.id === asset.id}
                          onClick={() => setDeleteCandidate(asset)}
                        >
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  No assets match the current filters. Try changing the filters or adding a new
                  item.
                </div>
              )}
            </QueryState>
          </SectionCard>
        </div>
      </div>

      <Modal
        isOpen={Boolean(deleteCandidate)}
        title="Delete asset"
        description={
          deleteCandidate
            ? `Delete "${deleteCandidate.name}"? This action cannot be undone.`
            : undefined
        }
      >
        <div className="modal-card__actions">
          <Button variant="ghost" onClick={() => setDeleteCandidate(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() =>
              deleteCandidate ? void deleteMutation.mutateAsync(deleteCandidate.id) : undefined
            }
          >
            Yes, delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
