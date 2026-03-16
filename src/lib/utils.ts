import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Optimise image URLs for performance:
 * - Unsplash: appends w/q/fm params if not already present
 * - Others: returned as-is
 */
export function optimiseImageUrl(url: string | null | undefined, width = 800): string | undefined {
  if (!url) return undefined;
  if (url.includes("images.unsplash.com")) {
    const u = new URL(url);
    if (!u.searchParams.has("w")) u.searchParams.set("w", String(width));
    if (!u.searchParams.has("q")) u.searchParams.set("q", "80");
    if (!u.searchParams.has("fm")) u.searchParams.set("fm", "webp");
    return u.toString();
  }
  return url;
}
