import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  AES_SECRET: Joi.string().min(32).required(),
  BINANCE_API_KEY: Joi.string().allow('').optional(),
  BINANCE_API_SECRET: Joi.string().allow('').optional(),
  BINANCE_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('https://api.binance.com'),
  BLOCKSCAN_API_KEY: Joi.string().allow('').optional(),
  BLOCKSCAN_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('https://api.etherscan.io/v2/api'),
  BLOCKSCAN_CHAIN_ID: Joi.string().default('1'),
  MONOBANK_TOKEN: Joi.string().allow('').optional(),
  MONOBANK_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('https://api.monobank.ua'),
  VITE_API_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
});
