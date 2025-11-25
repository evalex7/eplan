// src/components/ai/reschedule-modal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type SuggestedItem = {
  id: string;
  name: string;
  suggestedDates: string[];
  reason?: string;
};

export default function RescheduleModal({
  open,
  onClose,
  periods,
  monthRef,
}: {
  open: boolean;
  onClose: () => void;
  periods: any[]; // SimplePeriod[]
  monthRef?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/assistant/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods, monthRef }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.data) {
        setResult(data.data as SuggestedItem[]);
      } else {
        setError(data.error || "AI error. Raw: " + (data.raw || ""));
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Асистент розподілу ТО</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            Натисніть «Запустити», щоб отримати рекомендовані дати для виділених періодів ТО.
          </p>

          <div className="mt-4">
            <Button onClick={handleRun} disabled={loading}>
              {loading ? "Працюю..." : "Запустити"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="ml-2">Закрити</Button>
          </div>

          <div className="mt-4">
            {error && <div className="text-red-600 text-sm">{error}</div>}

            {result && (
              <div className="space-y-3 max-h-72 overflow-auto">
                {result.map(r => (
                  <div key={r.id} className="p-3 border rounded">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-sm text-muted-foreground">Пропозиції: {r.suggestedDates.join(", ")}</div>
                    {r.reason && <div className="text-xs text-muted-foreground mt-1">Пояснення: {r.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Закрити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
