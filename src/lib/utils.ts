import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

export function parseSpanishDate(dateStr: string): Date | null {
  // Formato esperado: "9 de junio, 2026"
  const match = dateStr.match(/^(\d{1,2})\s+de\s+(\w+)[,\s]*(\d{4})$/i);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const monthName = match[2].toLowerCase();
  const year = parseInt(match[3], 10);
  const month = SPANISH_MONTHS[monthName];
  if (month === undefined) return null;
  return new Date(year, month, day);
}

/**
 * Checks if an event is in the past based on its date and schedule string.
 * @param dateStr Event date in "d de MMMM, yyyy" (Spanish) or YYYY-MM-DD format
 * @param scheduleStr Event time description, e.g., "10:00 - 14:00"
 */
export function isEventPast(dateStr: string, scheduleStr?: string): boolean {
  if (!dateStr) return false;
  
  const now = new Date();
  
  // Try Spanish format first (e.g. "9 de junio, 2026")
  let eventDate = parseSpanishDate(dateStr);
  
  // Fallback to YYYY-MM-DD format
  if (!eventDate) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  
  if (!eventDate || isNaN(eventDate.getTime())) return false;
  
  // Set to today locally for comparison without time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // If the date is strictly in the past, it's past
  if (eventDate.getTime() < today.getTime()) return true;
  
  // If the date is strictly in the future, it's NOT past
  if (eventDate.getTime() > today.getTime()) return false;
  
  // If the event is TODAY, check the schedule to see if the time has passed
  if (scheduleStr) {
    const s = scheduleStr.toLowerCase();
    
    // Find all time mentions (e.g. "14:00", "2 pm", "2:30 p.m.")
    const regex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/g;
    let match;
    let lastParsedDate: Date | null = null;
    
    while ((match = regex.exec(s)) !== null) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3]; // "pm", "am", etc.
      
      // Convert to 24-hour format
      if (period && period.includes('p') && hours < 12) {
        hours += 12;
      } else if (period && period.includes('a') && hours === 12) {
        hours = 0;
      } else if (!period && hours < 12 && s.includes('pm')) {
        hours += 12;
      }
      
      lastParsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }
    
    if (lastParsedDate) {
      if (now > lastParsedDate) {
        return true;
      }
      return false;
    }
  }
  
  return false;
}
