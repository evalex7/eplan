import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import type { ServiceContract, ServiceEngineer } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

// TODO: Підключіть реальний сервіс для надсилання листів (наприклад, Resend, SendGrid)
// і замініть цю функцію-заглушку.
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; }) {
  console.log('--- Sending Email (Simulation) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------');
  // У реальному застосунку тут буде виклик API вашого поштового сервісу
  // наприклад: await resend.emails.send({ from: 'onboarding@resend.dev', to, subject, html });
  return Promise.resolve({ id: `simulated_${Date.now()}` });
}

function createEmailTemplate(engineerName: string, task: any): string {
    const startDate = task.startDate ? format(new Date(task.startDate.seconds * 1000), 'PPP', { locale: uk }) : 'Не вказано';
    const endDate = task.endDate ? format(new Date(task.endDate.seconds * 1000), 'PPP', { locale: uk }) : 'Не вказано';

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
    if (!admin.apps.length) {
      // Log the error for server-side debugging
      console.error('Firebase Admin SDK is not initialized. Check server configuration.');
      // Return a proper JSON error response to the client
      return NextResponse.json({ 
        error: 'Сервіс сповіщень не налаштовано на сервері.', 
        details: 'Firebase Admin SDK не ініціалізовано. Зверніться до адміністратора.' 
      }, { status: 500 });
    }

    const db = admin.firestore();
    const today = new Date();
    const upcomingDays = 7;
    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + upcomingDays);

    // 1. Отримати всіх інженерів
    const engineersSnapshot = await db.collection('serviceEngineers').get();
    const engineers = engineersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceEngineer[];
    const engineersMap = new Map(engineers.map(e => [e.id, e]));

    // 2. Отримати всі активні договори
    const contractsSnapshot = await db.collection('serviceContracts').where('archived', '==', false).get();
    const contracts = contractsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceContract[];

    const notificationsToSend: Promise<any>[] = [];
    let tasksFound = 0;

    // 3. Знайти майбутні періоди ТО
    contracts.forEach(contract => {
        if (contract.maintenancePeriods) {
            contract.maintenancePeriods.forEach(period => {
                const startDate = period.startDate ? new Date((period.startDate as any).seconds * 1000) : null;
                if (startDate && startDate >= today && startDate <= upcomingDate && period.status === 'Заплановано' && period.assignedEngineerIds && period.assignedEngineerIds.length > 0) {
                    tasksFound++;
                    period.assignedEngineerIds.forEach(engineerId => {
                        const engineer = engineersMap.get(engineerId);
                        if (engineer && engineer.email) {
                            const emailHtml = createEmailTemplate(engineer.name, { ...period, contract });
                            const emailPromise = sendEmail({
                                to: engineer.email,
                                subject: `Нагадування: планове ТО для "${contract.objectName}"`,
                                html: emailHtml,
                            });
                            notificationsToSend.push(emailPromise);
                        }
                    });
                }
            });
        }
    });

    if (notificationsToSend.length === 0) {
      return NextResponse.json({ message: `Не знайдено завдань для сповіщення у найближчі ${upcomingDays} днів.` });
    }

    await Promise.all(notificationsToSend);

    return NextResponse.json({ message: `Успішно надіслано ${notificationsToSend.length} нагадувань.` });

  } catch (error: any) {
    console.error('Error in /api/send-reminders:', error);
    return NextResponse.json({ error: 'Не вдалося надіслати нагадування.', details: error.message }, { status: 500 });
  }
}
