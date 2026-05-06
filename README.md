# Веборієнтоване рішення для моніторингу особистих витрат та активів

Цей репозиторій містить кваліфікаційну роботу на тему: **«Веборієнтоване рішення для моніторингу особистих витрат та активів»**.

Мета проєкту полягає у створенні вебзастосунку для обліку активів користувача, оновлення балансів з зовнішніх джерел, перерахунку вартості у базову валюту та відображення аналітики.

## Використані технології

### Backend
- NestJS
- Prisma
- PostgreSQL
- JWT authentication
- Jest

### Frontend
- React
- Vite
- TypeScript
- React Query
- Recharts

### Інше
- Docker Compose
- Nginx

## Структура проєкту

- `backend/` - серверна частина
- `frontend/` - клієнтська частина
- `docker-compose.yml` - запуск проєкту в контейнерах

## Основні можливості

- реєстрація та авторизація користувача
- створення, редагування та видалення активів
- ручне та автоматичне оновлення активів
- інтеграція з Binance
- інтеграція з Monobank
- інтеграція з Blockscan
- завантаження та збереження курсів валют
- аналітика загальної вартості активів
- перегляд структури активів і динаміки

## Запуск через Docker Compose

Перед запуском потрібно створити файл `.env` у корені проєкту.

Приклад основних змінних:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/diploma_finance
PORT=3000
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
AES_SECRET=your_aes_secret_here
BINANCE_BASE_URL=https://api.binance.com
BLOCKSCAN_API_KEY=
BLOCKSCAN_BASE_URL=https://api.etherscan.io/v2/api
BLOCKSCAN_CHAIN_ID=1
MONOBANK_BASE_URL=https://api.monobank.ua
VITE_API_URL=http://localhost:3000
```

Далі запуск:

```bash
docker compose up --build
```

Після запуску:

- frontend: `http://localhost:8080`
- backend: `http://localhost:3000`

## Запуск без Docker

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Тести

У проєкті використовується Jest для backend-тестування.

Основні тестові файли:

- `backend/src/app.controller.spec.ts`
- `backend/src/modules/auth/auth.service.spec.ts`

Запуск тестів:

```bash
cd backend
npm test
```

## Відомі обмеження

- у поточній версії не реалізовано механізм refresh token
- `analytics/history` наповнюється переважно на основі транзакцій Monobank
- `BLOCKSCAN_CHAIN_ID` задається глобально, тому одночасна робота з різними мережами не передбачена

## Призначення роботи

Проєкт розроблений у навчальних цілях як кваліфікаційна робота за спеціальністю **«Інженерія програмного забезпечення»**.
