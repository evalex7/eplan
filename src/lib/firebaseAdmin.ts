import adminModule from 'firebase-admin';

if (!adminModule.apps.length) {
  adminModule.initializeApp({
    credential: adminModule.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

// ✅ Експортуємо тільки named export
export const admin = adminModule;
