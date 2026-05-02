import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../shared/api/analytics';
import { assetsApi } from '../shared/api/assets';
import { systemApi } from '../shared/api/system';
import { QueryState } from '../shared/components/QueryState';
import { SectionCard } from '../shared/components/SectionCard';
import { StatCard } from '../shared/components/StatCard';
import { Badge } from '../shared/components/ui/Badge';
import { Button } from '../shared/components/ui/Button';
import { assetTypeMeta, providerMeta } from '../shared/lib/asset-meta';
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
} from '../shared/lib/format';

const pieColors = ['#c55c3b', '#21453e', '#ddc174', '#5e6b7b', '#93663a', '#56778b'];

export function DashboardPage() {
  const netWorthQuery = useQuery({
    queryKey: ['net-worth'],
    queryFn: analyticsApi.getNetWorth,
  });

  const distributionQuery = useQuery({
    queryKey: ['distribution'],
    queryFn: analyticsApi.getDistribution,
  });

  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: analyticsApi.getHistory,
  });

  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: assetsApi.getAssets,
  });

  const systemHealthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: systemApi.getHealth,
    refetchInterval: 60000,
  });

  const topAssets = useMemo(() => {
    return [...(netWorthQuery.data?.items ?? [])]
      .sort((left, right) => right.valueUah - left.valueUah)
      .slice(0, 5);
  }, [netWorthQuery.data]);

  const propertyMix = useMemo(() => {
    const assets = assetsQuery.data ?? [];

    return {
      movable: assets.filter((asset) => assetTypeMeta[asset.type].group === 'movable').length,
      immovable: assets.filter((asset) => assetTypeMeta[asset.type].group === 'immovable').length,
      financial: assets.filter((asset) => assetTypeMeta[asset.type].group === 'financial').length,
      digital: assets.filter((asset) => assetTypeMeta[asset.type].group === 'digital').length,
    };
  }, [assetsQuery.data]);

  const providerCards = useMemo(() => {
    const assets = assetsQuery.data ?? [];

    return (Object.keys(providerMeta) as Array<keyof typeof providerMeta>).map((provider) => ({
      provider,
      ...providerMeta[provider],
      count: assets.filter((asset) => asset.credential?.provider === provider).length,
    }));
  }, [assetsQuery.data]);

  const latestHistoryPoint = historyQuery.data?.[historyQuery.data.length - 1];
  const systemHealthy = systemHealthQuery.data?.status === 'ok' && !systemHealthQuery.isError;

  return (
    <div className="page-stack">
      <section className="hero-panel hero-panel--dashboard">
        <div className="hero-copy">
          <div className="eyebrow">Dashboard</div>
          <h1>Overview</h1>
          <div className="hero-actions">
            <Link to="/assets">
              <Button>Manage assets</Button>
            </Link>
            <Link to="/converter">
              <Button variant="ghost">Converter</Button>
            </Link>
          </div>
        </div>

        <div className="hero-highlights">
          <div className="hero-stat">
            <span>Net worth</span>
            <strong>{formatMoney(netWorthQuery.data?.totalUah ?? 0)}</strong>
          </div>
          <div className="hero-chip-grid">
            <div className="hero-chip">
              <span>API</span>
              <Badge tone={systemHealthy ? 'success' : 'warning'}>
                {systemHealthy ? 'online' : 'check'}
              </Badge>
            </div>
            <div className="hero-chip">
              <span>Assets</span>
              <strong>{assetsQuery.data?.length ?? 0}</strong>
            </div>
            <div className="hero-chip">
              <span>Connected</span>
              <strong>{providerCards.filter((provider) => provider.count > 0).length}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid stats-grid--four">
        <StatCard label="Movable" value={String(propertyMix.movable)} />
        <StatCard label="Real estate" value={String(propertyMix.immovable)} />
        <StatCard label="Financial" value={String(propertyMix.financial)} />
        <StatCard label="Digital" value={String(propertyMix.digital)} />
      </div>

      <div className="dashboard-grid dashboard-grid--analytics">
        <SectionCard title="Trend">
          <QueryState query={historyQuery}>
            {historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={historyQuery.data}>
                    <defs>
                      <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c55c3b" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#c55c3b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                    <Area
                      type="monotone"
                      dataKey="totalUah"
                      stroke="#9e4024"
                      fill="url(#historyGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="insight-row">
                  <div className="insight-card">
                    <span>Latest</span>
                    <strong>{latestHistoryPoint ? formatMoney(latestHistoryPoint.totalUah) : '-'}</strong>
                  </div>
                  <div className="insight-card">
                    <span>Delta</span>
                    <strong>
                      {latestHistoryPoint ? formatMoney(latestHistoryPoint.deltaUah) : formatMoney(0)}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">No history yet.</div>
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="Structure">
          <QueryState query={distributionQuery}>
            {distributionQuery.data && distributionQuery.data.length > 0 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={distributionQuery.data}
                      dataKey="valueUah"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                    >
                      {distributionQuery.data.map((entry, index) => (
                        <Cell key={entry.type} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend-list">
                  {distributionQuery.data.map((item, index) => (
                    <div key={item.type} className="legend-item">
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: pieColors[index % pieColors.length] }}
                      />
                      <span>{assetTypeMeta[item.type].label}</span>
                      <strong>{formatPercent(item.percentage)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">No data yet.</div>
            )}
          </QueryState>
        </SectionCard>
      </div>

      <div className="dashboard-grid dashboard-grid--secondary">
        <SectionCard title="Top assets">
          <QueryState query={netWorthQuery}>
            {topAssets.length > 0 ? (
              <div className="top-assets-list">
                {topAssets.map((item, index) => {
                  const share = (item.valueUah / Math.max(netWorthQuery.data?.totalUah ?? 1, 1)) * 100;

                  return (
                    <div key={item.id} className="top-assets-item">
                      <div className="top-assets-item__head">
                        <div>
                          <strong>
                            {assetTypeMeta[item.type].icon} {index + 1}. {item.name}
                          </strong>
                          <span>
                            {assetTypeMeta[item.type].label} | {item.balance} {item.currency}
                          </span>
                        </div>
                        <Badge tone="accent">{formatPercent(share)}%</Badge>
                      </div>
                      <div className="meter">
                        <div className="meter__bar" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                      <div className="top-assets-item__foot">
                        <span>{formatMoney(item.rateToUah)} rate</span>
                        <strong>{formatMoney(item.valueUah)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No assets yet.</div>
            )}
          </QueryState>
        </SectionCard>

        <SectionCard title="Sources">
          <QueryState query={assetsQuery}>
            <div className="provider-grid">
              {providerCards.map((provider) => (
                <div key={provider.provider} className="provider-card">
                  <div className="provider-card__head">
                    <strong>
                      {provider.icon} {provider.label}
                    </strong>
                    <Badge tone={provider.count > 0 ? 'success' : 'neutral'}>
                      {provider.count > 0 ? `${provider.count} asset(s)` : 'none'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </QueryState>
        </SectionCard>
      </div>

      <SectionCard title="System">
        <div className="ops-grid">
          <div className="ops-card">
            <span>Backend</span>
            <strong>{systemHealthy ? 'OK' : 'Attention'}</strong>
          </div>
          <div className="ops-card">
            <span>Last update</span>
            <strong>
              {assetsQuery.data && assetsQuery.data.length > 0
                ? formatDateTime(
                    [...assetsQuery.data].sort(
                      (left, right) =>
                        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
                    )[0].updatedAt,
                  )
                : '-'}
            </strong>
          </div>
          <div className="ops-card">
            <span>Total</span>
            <strong>{formatCompactNumber(netWorthQuery.data?.totalUah ?? 0)}</strong>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
