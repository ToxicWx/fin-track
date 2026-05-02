export type BinanceAccountBalance = {
  asset: string;
  free: string;
  locked: string;
};

export type BinanceAccountResponse = {
  balances: BinanceAccountBalance[];
};

export type BinanceTickerPriceResponse = {
  symbol: string;
  price: string;
};
