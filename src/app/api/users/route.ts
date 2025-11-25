import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    // First, check if the admin app was initialized correctly
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK не ініціалізовано. Перевірте конфігурацію сервера.');
    }

    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map(userRecord => {
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: userRecord.customClaims?.role || 'engineer', // Default to 'engineer'
        disabled: userRecord.disabled,
      };
    });
    return NextResponse.json({ users });

  } catch (error: any) {
    console.error('Error fetching users from /api/users:', error);

    let errorMessage = 'Не вдалося завантажити користувачів через внутрішню помилку сервера.';
    
    // Provide more specific error messages for common Firebase Admin SDK issues
    if (error.code === 'app/invalid-credential' || error.message.includes('credential')) {
        errorMessage = 'Помилка конфігурації Firebase Admin. Перевірте, чи правильно встановлені змінні середовища (ключі) на сервері.';
    } else if (error.code === 'auth/insufficient-permission') {
        errorMessage = 'Недостатньо прав для перегляду користувачів. Перевірте налаштування сервісного акаунта та його ролі в Google Cloud (IAM).';
    } else if (error.message.includes('Firebase Admin SDK не ініціалізовано')) {
        errorMessage = error.message;
    }

    // Always return a JSON response, even on error
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
