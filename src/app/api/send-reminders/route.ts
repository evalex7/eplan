"use server";

import admin from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

// Обов'язково: ТІЛЬКИ async-функції
export async function POST() {
  try {
    const firestore = admin.firestore();

    const now = new Date();
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();

    // Отримуємо всі профілі
    const profilesSnapshot = await firestore.collection("profiles").get();

    const remindersToSend: any[] = [];

    profilesSnapshot.forEach((doc) => {
      const profile = doc.data();
      const reminders = profile?.reminders || [];

      reminders.forEach((reminder: any) => {
        if (!reminder.time) return;

        const [h, m] = reminder.time.split(":").map(Number);

        if (h === nowHour && m === nowMinute) {
          remindersToSend.push({
            userId: doc.id,
            reminder,
          });
        }
      });
    });

    // Тут ти можеш передати remindersToSend у push-повідомлення Firebase
    console.log("Reminders to send:", remindersToSend);

    return NextResponse.json({ ok: true, remindersToSend });
  } catch (err: any) {
    console.error("Error in reminders API:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
