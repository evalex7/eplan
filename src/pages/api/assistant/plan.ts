// src/pages/api/assistant/plan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { planMaintenanceWithAI, SimplePeriod } from "@/lib/ai/openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  const { periods, monthRef } = req.body as { periods?: SimplePeriod[]; monthRef?: string };

  if (!periods || !Array.isArray(periods) || periods.length === 0) {
    return res.status(400).json({ error: "periods array required" });
  }

  try {
    const result = await planMaintenanceWithAI(periods, monthRef);
    if (result.parsed) {
      return res.status(200).json({ ok: true, data: result.parsed, raw: result.raw });
    } else {
      return res.status(200).json({ ok: false, raw: result.raw, error: result.error });
    }
  } catch (err: any) {
    console.error("AI error:", err);
    return res.status(500).json({ error: err.message || "AI error" });
  }
}
