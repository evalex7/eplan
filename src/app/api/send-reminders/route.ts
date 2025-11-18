import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';
import type { ServiceContract, ServiceEngineer } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

// TODO: замінити мокове надсилання на реальний поштовий сервіс (Resend / SendGrid)
async function sendEmail({
  to,
  subject,
  html
}: { to: string; subject: string; html: string }) {
  console.log('--- Sending Email (Simulation) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------');
  return Promise.resolve({ id: `simulated_${Date.now()}` });
}

function createEmailTemplate(engineerName: string, task: any): string {
  const startDate = task.startDate
    ? format(new Date(task.startDate.seconds * 1000), 'PPP', { locale: uk })
    : 'Не вказано';

  const endDate = task.endDate
    ? format(new Date(task.endDate.seconds * 1000), 'PPP', { locale: uk })
    : 'Не вказано';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
            h1 { color: #1e88e5; }
            .task-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
            .task-details p { margin: 5px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Нагадування про планове ТО</h1>
            <p>Шановний(а) ${engineerName},</p>
            <p>Нагадуємо вам про заплановане технічне обслуговування, яке призначене вам найближчим часом.</p>
            <div class="task-details">
                <p><strong>Об'єкт:</strong> ${task.contract.objectName}</p>
                <p><strong>Адреса:</strong> ${task.contract.address}</p>
                <p><strong>Період виконання:</strong> з ${startDate} по ${endDate}</p>
                <p><strong>Опис періоду:</strong> ${task.name}</p>
            </div>
            <p>Будь ласка, сплануйте свій час та підготуйтеся до виконання робіт.</p>
            <p>З повагою,<br>Система AirControl</p>
        </div>
    </body>
    </html>
  `;
}

export async function POST() {
  try {
    // ------------------------------
    // 1. Firebase Admin
    // ------------------------------
    const admin = getAdminApp();
    const db = admin.firestore();

    const today = new Date();
    const upcomingDays = 7;
    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + upcomingDays);

    // ------------------------------
    // 2. Отримати інженерів
    // ------------------------------
    const engineersSnapshot = await db.collection('serviceEngineers').get();
    const engineers = engineersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceEngineer[];

    const engineersMap = new Map(engineers.map(e => [e.id, e]));

    // ------------------------------
    // 3. Отримати активні договори
    // ------------------------------
    const contractsSnapshot = await db
      .collection('serviceContracts')
      .where('archived', '==', false)
      .get();

    const contracts = contractsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ServiceContract[];

    const notifications: Promise<any>[] = [];
    let tasksFound = 0;

    // ------------------------------
    // 4. Знайти ТО у наступні 7 днів
    // ------------------------------
    for (const contract of contracts) {
      if (!contract.maintenancePeriods) continue;

      for (const period of contract.maintenancePeriods) {
        const startDate = period.startDate
          ? new Date(period.startDate.seconds * 1000)
          : null;

        if (
          startDate &&
          startDate >= today &&
          startDate <= upcomingDate &&
          period.status === 'Заплановано' &&
          period.assignedEngineerIds?.length > 0
        ) {
          tasksFound++;

          for (const engineerId of period.assignedEngineerIds) {
            const engineer = engineersMap.get(engineerId);
            if (!engineer?.email) continue;

            const html = createEmailTemplate(engineer.name, {
              ...period,
              contract
            });

            notifications.push(
              sendEmail({
                to: engineer.email,
                subject: `Нагадування: планове ТО для "${contract.objectName}"`,
                html
              })
            );
          }
        }
      }
    }

    // ------------------------------
    // 5. Якщо немає нагадувань
    // ------------------------------
    if (notifications.length === 0) {
      return NextResponse.json({
        message: `Не знайдено завдань для сповіщення у найближчі ${upcomingDays} днів.`
      });
    }

    // ------------------------------
    // 6. Надіслати всі листи
    // ------------------------------
    await Promise.all(notifications);

    return NextResponse.json({
      message: `Успішно надіслано ${notifications.length} нагадувань.`
    });
  } catch (error: any) {
    console.error('Error in /api/send-reminders:', error);
    return NextResponse.json(
      {
        error: 'Не вдалося надіслати нагадування.',
        details: error.message
      },
      { status: 500 }
    );
  }
}
