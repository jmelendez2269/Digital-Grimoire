/**
 * Auto-stamp casting conditions from a given date/time.
 * These are the environmental facts that contextualize a working as an experiment —
 * moon phase, planetary day-ruler, and season (Northern Hemisphere).
 */

export type WorkingConditions = {
  moon_phase: string;
  moon_phase_emoji: string;
  moon_illumination: number; // 0–1 approximate
  day_ruler: string;         // e.g. "Jupiter"
  day_ruler_planet: string;  // Unicode symbol e.g. "♃"
  season: string;            // Spring | Summer | Autumn | Winter
  cast_date: string;         // ISO date YYYY-MM-DD
};

// Reference new moon: 2000-01-06T18:14:00Z (Jean Meeus, Astronomical Algorithms)
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const LUNAR_CYCLE_DAYS = 29.530588;
const MS_PER_DAY = 86_400_000;

function moonPhase(date: Date): Pick<WorkingConditions, "moon_phase" | "moon_phase_emoji" | "moon_illumination"> {
  const daysSinceRef = (date.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
  const cyclePos = ((daysSinceRef % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const pct = cyclePos / LUNAR_CYCLE_DAYS;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * pct)) / 2) * 100) / 100;

  let moon_phase: string;
  let moon_phase_emoji: string;
  if (pct < 0.0625)      { moon_phase = "New Moon";        moon_phase_emoji = "🌑"; }
  else if (pct < 0.1875) { moon_phase = "Waxing Crescent"; moon_phase_emoji = "🌒"; }
  else if (pct < 0.3125) { moon_phase = "First Quarter";   moon_phase_emoji = "🌓"; }
  else if (pct < 0.4375) { moon_phase = "Waxing Gibbous";  moon_phase_emoji = "🌔"; }
  else if (pct < 0.5625) { moon_phase = "Full Moon";       moon_phase_emoji = "🌕"; }
  else if (pct < 0.6875) { moon_phase = "Waning Gibbous";  moon_phase_emoji = "🌖"; }
  else if (pct < 0.8125) { moon_phase = "Last Quarter";    moon_phase_emoji = "🌗"; }
  else                   { moon_phase = "Waning Crescent"; moon_phase_emoji = "🌘"; }

  return { moon_phase, moon_phase_emoji, moon_illumination: illumination };
}

// Classical planetary day-rulers (Sunday=0 … Saturday=6)
const DAY_RULERS: Array<{ day_ruler: string; day_ruler_planet: string }> = [
  { day_ruler: "Sun",     day_ruler_planet: "☉" }, // 0 Sunday
  { day_ruler: "Moon",    day_ruler_planet: "☽" }, // 1 Monday
  { day_ruler: "Mars",    day_ruler_planet: "♂" }, // 2 Tuesday
  { day_ruler: "Mercury", day_ruler_planet: "☿" }, // 3 Wednesday
  { day_ruler: "Jupiter", day_ruler_planet: "♃" }, // 4 Thursday
  { day_ruler: "Venus",   day_ruler_planet: "♀" }, // 5 Friday
  { day_ruler: "Saturn",  day_ruler_planet: "♄" }, // 6 Saturday
];

function getSeason(date: Date): string {
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  if ((m === 3 && d >= 20) || m === 4 || m === 5 || (m === 6 && d <= 20)) return "Spring";
  if ((m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d <= 22)) return "Summer";
  if ((m === 9 && d >= 23) || m === 10 || m === 11 || (m === 12 && d <= 20)) return "Autumn";
  return "Winter";
}

/**
 * Compute all casting conditions for a given moment in time.
 * Call at the moment the practitioner marks a working as cast.
 */
export function stampConditions(castAt: Date = new Date()): WorkingConditions {
  return {
    ...moonPhase(castAt),
    ...DAY_RULERS[castAt.getDay()],
    season: getSeason(castAt),
    cast_date: castAt.toISOString().split("T")[0],
  };
}
