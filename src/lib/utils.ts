// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function cleanAddressForNavigation(address: string): string {
  if (!address) return "";
  return address
    .replace(/,?\s*літ\.\s*[«"']?\w+[»"']?/gi, "")
    .replace(/,?\s*корп\.\s*\w+/gi, "")
    .replace(/,?\s*буд\.\s*/gi, " ")
    .trim();
}

export function getDaysString(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "днів";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дні";
  return "днів";
}

export function capitalizeWords(str: string): string {
  if (!str) return "";

  const delimiters = /(\s+|-)/;
  return str
    .split(delimiters)
    .map((part) => {
      if (delimiters.test(part)) return part;
      if (part.length > 1 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}
