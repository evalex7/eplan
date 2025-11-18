"use server";
import admin from 'firebase-admin';

// This check prevents re-initialization in scenarios like hot-reloading
if (!admin.apps.length) {
  try {
    // Ensure environment variables are present before attempting to initialize
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('Firebase Admin SDK environment variables are not set.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Important: Replace newline characters for the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // In a real production environment, you might want to handle this more gracefully,
    // but for debugging, logging the error is crucial.
  }
}

export default admin;
