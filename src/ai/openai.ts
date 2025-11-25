import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function planMaintenance(tasks: any[]): Promise<string> {
  const prompt = `
    Є список завдань ТО. У кожного завдання є:
    - назва
    - локація
    - період (від ... до ...)
    - бажана тривалість

    Твоє завдання:
    1. Розподілити всі ТО рівномірно на місяць.
    2. Вибрати конкретні дати (1 або 2 дні) в межах дозволеного періоду.
    3. Уникати скупчення робіт в один день.
    4. Повернути відповідь у вигляді списку: 
       {назва} — рекомендована дата: {дд.мм.рррр}

    Дані:
    ${JSON.stringify(tasks, null, 2)}
  `;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content;
}
