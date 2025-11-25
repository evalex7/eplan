import type { NextApiRequest, NextApiResponse } from "next";
import { getAiResponse } from "@/ai/openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { task } = req.body;
  if (!task) return res.status(400).json({ error: "Task is required" });

  try {
    const answer = await getAiResponse(task);
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: "AI error" });
  }
}
