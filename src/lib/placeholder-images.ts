// src/lib/placeholder-images.ts
import data from '@/data/placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

/**
 * Масив зображень-заповнювачів.
 * Перевіряємо, чи дані з JSON дійсно масив.
 */
export const PlaceHolderImages: ImagePlaceholder[] = Array.isArray(data.placeholderImages)
  ? (data.placeholderImages as ImagePlaceholder[])
  : [];
