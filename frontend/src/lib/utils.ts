import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility function for combining class names with Tailwind merge.
 * Mandated by agent.frontend.md for shadcn/ui and component styling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

