// src/pages/api/ai.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getAiResponse } from "@/ai/openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: "Prompt is required" });

    const result = await getAiResponse(prompt);
    res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
