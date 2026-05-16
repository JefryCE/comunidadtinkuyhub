import { isEventPast } from "./src/lib/utils";

console.log("30 Mar 08:30", isEventPast("2026-03-30", "08:30")); // YESTERDAY -> true
console.log("01 Apr 08:00", isEventPast("2026-04-01", "08:00")); // TODAY, past -> true
console.log("01 Apr 15:00", isEventPast("2026-04-01", "15:00")); // TODAY, future -> false
console.log("02 Apr 08:00", isEventPast("2026-04-02", "08:00")); // TOMORROW -> false
console.log("01 Apr no time", isEventPast("2026-04-01")); // TODAY no time -> false
