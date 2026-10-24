<<<<<<< HEAD
# PennyLens — Firebase version

A React + Vite financial visibility dashboard with Firebase Authentication and Cloud Firestore.

## 1. Install and run

Open this folder in VS Code. In **Terminal → New Terminal**, run:

```bash
npm install
```

Create a file named `.env` in the project root (same folder as `package.json`). Copy the values from your Firebase web app configuration into the variables shown in `.env.example`. Do not add quotes.

Then run:

```bash
npm run dev
```

Open the local URL Vite prints, usually http://localhost:5173. Restart `npm run dev` after changing `.env`.

## 2. Firebase console setup

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.
2. Open **Firestore Database → Rules**. Copy the contents of `firestore.rules` into the Rules editor and click **Publish**.
3. Make sure you created a Cloud Firestore database in the same Firebase project as the web app.
4. In Authentication settings, confirm `localhost` is an authorized domain (it normally is by default).

## 3. Firebase web configuration

In Firebase Console, click the gear next to Project Overview → **Project settings** → **General** → Your apps → select your Web app. Copy the config values into `.env` using these names:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

These are browser app configuration values, not service-account credentials. Never put a service-account private key in this project.

## 4. Data and security

Transactions are stored in the `transactions` Firestore collection. Each document includes `user_id`, set to the signed-in Firebase user's UID. The included Firestore rules restrict reads, updates and deletes to the owning user. Do not publish permissive rules such as `allow read, write: if true`.

## 5. Test

- Create an account, add a transaction, refresh the page, and confirm it remains.
- Edit and delete a transaction.
- Import a CSV with `date,description,amount,type,category` columns.
- Create a second test account and confirm it cannot see the first account's transactions.
- Use demo mode to preview the dashboard without cloud data.

## Build

```bash
npm run build
```

For Vercel, set the six `VITE_FIREBASE_*` environment variables in the project settings and redeploy.
=======
# PennyLence
Personal finance dashboard for tracking transactions and understanding spending patterns.
>>>>>>> be95f12250332a48e5a6032dda4caa6da9a46185
