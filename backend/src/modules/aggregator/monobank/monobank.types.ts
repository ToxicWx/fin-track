export type MonobankAccount = {
  id: string;
  balance: number;
  creditLimit: number;
  type: string;
  currencyCode: number;
  iban?: string;
  maskedPan?: string[];
};

export type MonobankClientInfoResponse = {
  clientId: string;
  name: string;
  accounts: MonobankAccount[];
};

export type MonobankStatementItem = {
  id: string;
  time: number;
  description: string;
  amount: number;
  balance: number;
  currencyCode: number;
  comment?: string;
};
