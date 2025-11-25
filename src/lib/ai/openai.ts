// src/lib/ai/openai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SimplePeriod = {
  id: string;
  name: string;
  startDate?: string | Date;
  endDate?: string | Date;
  subdivision: string;
  assignedEngineerIds: string[];
  equipmentIds: string[];
  contractId?: string;
  contractName?: string;
  address?: string;
};

export async function planMaintenanceWithAI(periods: SimplePeriod[], monthRef?: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const prompt = `
У тебе є список періодів ТО. Для кожного періоду доступні поля:
- id, name, startDate, endDate, subdivision, assignedEngineerIds, equipmentIds, contractName, address

Завдання:
1) Розподілити всі періоди рівномірно по обраному місяцю (якщо monthRef задано у форматі YYYY-MM), інакше — по місяцю сьогоднішньої дати.
2) Для кожного періоду запропонувати 1 конкретну дату (формат DD.MM.YYYY), яка входить у період [startDate - endDate].
3) Мінімізувати накладання дат (бажано не більше 2 робіт в один день).
4) Якщо період має тільки одну можливу дату — використати її.
5) Повернути JSON масив об'єктів у наступному форматі:
[
  {
    "id": "<id періоду>",
    "name": "<назва>",
    "suggestedDates": ["DD.MM.YYYY"], // 1 або 2 дати
    "reason": "<коротке пояснення вибору>"
  },
  ...
]
Дані періодів:
${JSON.stringify(periods, null, 2)}
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // можна змінити під твій тариф
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const text = response.choices?.[0]?.message?.content ?? "";

  // Спроба парсити JSON з відповіді
  try {
    const firstJson = text.trim().match(/^\[.*\]$/s) ? text.trim() : text.substring(text.indexOf("["));
    const parsed = JSON.parse(firstJson);
    return { raw: text, parsed };
  } catch (err) {
    return { raw: text, parsed: null, error: "Failed to parse AI response" };
  }
}
