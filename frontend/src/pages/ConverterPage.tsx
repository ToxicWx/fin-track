import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ratesApi } from '../shared/api/rates';
import { QueryState } from '../shared/components/QueryState';
import { SectionCard } from '../shared/components/SectionCard';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { Select } from '../shared/components/ui/Select';
import { formatDateTime, formatMoney } from '../shared/lib/format';

export function ConverterPage() {
  const [amount, setAmount] = useState('1000');
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('UAH');

  const ratesQuery = useQuery({
    queryKey: ['currency-rates'],
    queryFn: ratesApi.getRates,
  });

  const rateMap = useMemo(() => {
    return new Map((ratesQuery.data ?? []).map((rate) => [rate.code.toUpperCase(), rate]));
  }, [ratesQuery.data]);

  const options = useMemo(() => {
    return (ratesQuery.data ?? []).map((rate) => ({
      label: `${rate.code} | ${rate.source}`,
      value: rate.code,
    }));
  }, [ratesQuery.data]);

  const amountNumber = Number(amount || 0);
  const fromRate = rateMap.get(fromCode)?.rateToUah ?? 0;
  const toRate = rateMap.get(toCode)?.rateToUah ?? 0;
  const result =
    fromRate > 0 && toRate > 0 ? Number(((amountNumber * fromRate) / toRate).toFixed(4)) : 0;

  const topRates = useMemo(() => {
    const preferredOrder = ['USD', 'EUR', 'PLN', 'BTC', 'ETH', 'SOL'];

    return preferredOrder
      .map((code) => (ratesQuery.data ?? []).find((rate) => rate.code.toUpperCase() === code))
      .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate));
  }, [ratesQuery.data]);

  return (
    <div className="page-stack">
      <section className="hero-panel hero-panel--thin hero-panel--compact">
        <div className="hero-copy">
          <div className="eyebrow">Converter</div>
          <h1>Currency converter</h1>
        </div>
      </section>

      <div className="page-stack">
        <SectionCard title="Conversion" subtitle="All rates are converted through UAH">
          <QueryState query={ratesQuery}>
            <div className="converter-layout">
              <div className="converter-form">
                <Input
                  label="Amount"
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <div className="converter-form__row">
                  <Select
                    label="From"
                    value={fromCode}
                    onChange={(event) => setFromCode(event.target.value)}
                    options={options}
                  />
                </div>
                <div className="converter-form__row">
                  <Select
                    label="To"
                    value={toCode}
                    onChange={(event) => setToCode(event.target.value)}
                    options={options}
                  />
                </div>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    const nextFrom = toCode;
                    setToCode(fromCode);
                    setFromCode(nextFrom);
                  }}
                >
                  Swap
                </Button>
              </div>

              <div className="insight-row insight-row--single">
                <div className="insight-card">
                  <span>Result</span>
                  <strong>
                    {result.toFixed(4)} {toCode}
                  </strong>
                  <small>
                    {amountNumber} {fromCode} = {result.toFixed(4)} {toCode}
                  </small>
                </div>
                <div className="insight-card">
                  <span>Via UAH</span>
                  <strong>{formatMoney(amountNumber * fromRate)}</strong>
                </div>
              </div>
            </div>
          </QueryState>
        </SectionCard>

        <SectionCard title="Key rates" subtitle="Saved exchange rates">
          <QueryState query={ratesQuery}>
            <div className="key-rates-grid">
              {topRates.map((rate) => (
                <div key={rate.code} className="top-assets-item">
                  <div className="top-assets-item__head">
                    <div>
                      <strong>{rate.code}</strong>
                      <span>Source: {rate.source}</span>
                    </div>
                    <strong>{formatMoney(rate.rateToUah)}</strong>
                  </div>
                  <div className="top-assets-item__foot">
                    <span>Updated</span>
                    <strong>{formatDateTime(rate.updatedAt)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </QueryState>
        </SectionCard>
      </div>
    </div>
  );
}
