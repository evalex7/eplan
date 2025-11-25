import type { NextApiRequest, NextApiResponse } from "next";
import { planMaintenance } from "@/ai/openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { tasks } = req.body;
  if (!tasks) return res.status(400).json({ error: "Tasks are required" });

  try {
    const result = await planMaintenance(tasks);
    res.status(200).json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "AI error" });
  }
}
