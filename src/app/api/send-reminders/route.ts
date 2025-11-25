// src/app/api/send-reminders/route.ts
import admin from '@/lib/firebaseAdmin';

export const GET = async (req: Request) => {
  try {
    // Просто повертаємо пустий масив або реальні дані з Firestore, якщо хочеш
    const snapshot = await admin.firestore().collection('tasks').get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify({ tasks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST = async (req: Request) => {
  try {
    // Приймаємо дані, але поки не відправляємо email/пуш
    const body = await req.json();

    // Зберігаємо у Firestore (опціонально)
    await admin.firestore().collection('reminders').add({
      ...body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ message: 'Reminder stored successfully' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return new Response(JSON.stringify({ error: 'Failed to create reminder' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
