# Collegiate React Native

## Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL=collegiate://reset-password
EXPO_PUBLIC_API_URL=http://localhost:5001
```

3. Start Expo:

```bash
npx expo start -c
```

## Backend Setup (Flask)

1. Create `api/.env` from `api/.env.example` and add required keys:

```env
COLLEGE_SCORECARD_BASE_URL=https://api.data.gov/ed/collegescorecard/v1/schools
COLLEGE_SCORECARD_API_KEY=...
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:8081
FREE_DAILY_TOKEN_LIMIT=5
```

2. Install backend dependencies:

```bash
npm run api:setup
```

3. Start backend API:

```bash
npm run api:start
```

Backend runs on `http://localhost:5001` and exposes:
- `GET /api/college/search`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/create-portal-session`
- `GET /api/stripe/subscription-status`
- `POST /api/stripe/webhook`
- `GET /api/tokens/status`

## Mobile Networking Notes

- iOS Simulator: use `EXPO_PUBLIC_API_URL=http://localhost:5001`
- Android Emulator: use `EXPO_PUBLIC_API_URL=http://10.0.2.2:5001`
- Physical device: use your computer LAN IP, e.g. `http://172.16.x.x:5001`
