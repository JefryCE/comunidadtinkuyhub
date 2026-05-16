import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if an event is in the past based on its date and schedule string.
 * @param dateStr Event date in YYYY-MM-DD format
 * @param scheduleStr Event time description, e.g., "10:00 - 14:00"
 */
export function isEventPast(dateStr: string, scheduleStr?: string): boolean {
  if (!dateStr) return false;
  
  const now = new Date();
  
  // Parse YYYY-MM-DD reliably in local time
  const [year, month, day] = dateStr.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);
  
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
        // Fallback: if 'pm' is somewhere in the string, assume hours < 12 are PM
        // (This handles "De 3 a 5 pm" -> both 3 and 5 become PM)
        hours += 12;
      }
      
      lastParsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }
    
    // If we successfully parsed at least one time
    if (lastParsedDate) {
      // If we are currently past the LAST mentioned time, consider it past
      if (now > lastParsedDate) {
        return true;
      }
      return false;
    }
  }
  
  // If it's today and we can't parse the time, assume it's still active today
  return false;
}
