
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface FontSizeDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentSize: number;
  onSizeChange: (size: number) => void;
}

export default function FontSizeDialog({
  isOpen,
  setIsOpen,
  currentSize,
  onSizeChange,
}: FontSizeDialogProps) {
  const [localSize, setLocalSize] = useState(currentSize);

  useEffect(() => {
    if (isOpen) {
      setLocalSize(currentSize);
    }
  }, [isOpen, currentSize]);

  // Preview size change in real-time on the body element
  useEffect(() => {
    if (isOpen) {
      document.body.style.fontSize = `${localSize}px`;
    }
  }, [localSize, isOpen]);

  const handleClose = () => {
    // Revert to original size if dialog is closed without saving
    document.body.style.fontSize = `${currentSize}px`;
    setIsOpen(false);
  };

  const handleSave = () => {
    onSizeChange(localSize); // Persist the change
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            handleClose();
        } else {
            setIsOpen(true);
        }
    }}>
      <DialogContent onEscapeKeyDown={handleClose} onPointerDownOutside={handleClose} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Розмір шрифту</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <div className="flex justify-between items-center px-2 mb-4">
                <span className="text-sm text-muted-foreground">A</span>
                <span className="text-3xl text-muted-foreground">A</span>
            </div>
            <Slider
                value={[localSize]}
                onValueChange={(value) => setLocalSize(value[0])}
                min={12}
                max={20}
                step={1}
            />
             <div className="text-center mt-3 text-lg font-bold text-foreground">
                {localSize}px
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Закрити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
