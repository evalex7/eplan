"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { capitalizeWords } from "@/lib/utils";

interface EditFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: string;
  value: string | Date | null;
  onSave: (value: string | Date | null) => void;
}

export default function EditFieldDialog({
  open,
  onOpenChange,
  field,
  value,
  onSave,
}: EditFieldDialogProps) {
  const [inputValue, setInputValue] = useState<string>(
    typeof value === "string" ? value : ""
  );
  const [dateValue, setDateValue] = useState<Date | null>(
    value instanceof Date ? value : null
  );

  const isDateField = useMemo(
    () => field.toLowerCase().includes("дата"),
    [field]
  );

  useEffect(() => {
    if (open) {
        if (typeof value === "string") setInputValue(value);
        if (value instanceof Date) setDateValue(value);
    }
  }, [value, open]);

  const handleSave = () => {
    if (isDateField) {
      onSave(dateValue);
    } else {
        onSave(inputValue);
    }
    onOpenChange(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart, selectionEnd } = e.target;
    let capitalizedValue = value;
    if (field.toLowerCase() === "ім'я" || field.toLowerCase() === 'посада') {
        capitalizedValue = capitalizeWords(value);
    }

    setInputValue(capitalizedValue);

    // Restore cursor position after state update
    setTimeout(() => {
        if (e.target && selectionStart !== null && selectionEnd !== null) {
            e.target.setSelectionRange(selectionStart, selectionEnd);
        }
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редагувати поле</DialogTitle>
          <DialogDescription>
            Введіть нове значення для <strong>{field}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!isDateField ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Значення
              </Label>
              <Input
                id="value"
                value={inputValue}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="col-span-3 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? format(dateValue, "dd.MM.yyyy") : "Оберіть дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0">
                  <Calendar
                    mode="single"
                    selected={dateValue ?? undefined}
                    onSelect={(d) => setDateValue(d ?? null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSave}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
