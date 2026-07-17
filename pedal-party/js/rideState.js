/* ════════════════════════════════════════════════════════════════
   rideState.js — Google Sheet CMS + Next Ride state machine.

   ISOLATED MODULE, zero DOM access. This file becomes the Framer
   code component later — keep every bit of fetch/state logic here.

   All time logic is America/Chicago (Central Time). The visitor's
   local clock offset is never trusted for state decisions.
   ════════════════════════════════════════════════════════════════ */

/* Paste the published-to-web CSV link of the Google Sheet here
   (File → Share → Publish to web → CSV). Empty string = use
   SAMPLE_ROWS below, so the prototype works offline. */
export const SHEET_URL = "";

export const INSTAGRAM_URL = "https://instagram.com/pedalpartylr";

/* Sample data matching the sheet schema in SHEET_SETUP.md.
   The 2026-07-20 row mirrors the real "Christmas in July" announcement. */
export const SAMPLE_ROWS = [
  {
    ride_date: "2026-07-20",
    status: "scheduled",
    title: "Christmas in July",
    hype_line: "Santa hats in the sunshine, jingle bells on handlebars — bring your merriest mid-summer self.",
    location: "Whole Hog BBQ",
    gather_time: "6:00 PM",
    roll_time: "6:30 PM",
    plan: "Gather at Whole Hog BBQ — decorate your bike, meet the pack\nRoll out along the river trail with holiday tunes\nMidpoint hang: BBQ, cold drinks & a very July Christmas\nCruise back nice and easy before sunset",
    heads_up: "It's July in Arkansas — hydrate like it's your job. Helmets encouraged, bring lights for the ride back.",
    image_url: "assets/announcement-sample.jpg",
    note: ""
  },
  {
    ride_date: "2026-09-07",
    status: "no_ride",
    title: "",
    hype_line: "",
    location: "",
    gather_time: "",
    roll_time: "",
    plan: "",
    heads_up: "",
    image_url: "",
    note: "Taking Labor Day off — rest those legs, we ride next Monday!"
  }
];

/* ── CSV parsing (handles quoted cells with commas + newlines) ── */
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== "")) rows.push(row);

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(cells => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
}

/* ── Central Time helpers ────────────────────────────────────── */
const CT_ZONE = "America/Chicago";
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of `date` in Central Time. */
export function ctParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CT_ZONE, weekday: "short",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t)?.value;
  return {
    y: +get("year"), mo: +get("month"), d: +get("day"),
    hh: +get("hour") % 24, mm: +get("minute"),
    wd: WEEKDAYS[get("weekday")]
  };
}

/** Epoch Date for a Central Time wall-clock moment (handles CST/CDT). */
export function centralInstant(y, mo, d, hh = 0, mm = 0) {
  for (const offset of [5, 6]) { // CDT then CST
    const guess = new Date(Date.UTC(y, mo - 1, d, hh + offset, mm));
    const p = ctParts(guess);
    if (p.y === y && p.mo === mo && p.d === d && p.hh === hh && p.mm === mm) return guess;
  }
  return new Date(Date.UTC(y, mo - 1, d, hh + 6, mm));
}

/** {y,mo,d} plus n days (pure calendar math). */
function addDays({ y, mo, d }, n) {
  const t = new Date(Date.UTC(y, mo - 1, d + n));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const iso = ({ y, mo, d }) =>
  `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Next Saturday 12:00 PM CT strictly after `now`. */
export function nextSaturdayNoon(now = new Date()) {
  const ct = ctParts(now);
  let days = (6 - ct.wd + 7) % 7;
  if (days === 0 && ct.hh >= 12) days = 7; // Sat afternoon → next week
  const target = addDays(ct, days);
  return centralInstant(target.y, target.mo, target.d, 12, 0);
}

/* ── The state machine (§6.2 of the build guide) ─────────────── */
/**
 * resolveRideState(rows, now?) →
 *   { state, row?, note?, countdownTo?, targetMondayISO? }
 * state ∈ LIVE | COUNTDOWN | NO_RIDE | WEATHER_CANCEL | OFF_SEASON
 */
export function resolveRideState(rows, now = new Date()) {
  const ct = ctParts(now);

  /* 1 · Off-season: Nov 1 – Mar 31 → countdown to April Fools' noon */
  if (ct.mo >= 11 || ct.mo <= 3) {
    const seasonYear = ct.mo >= 11 ? ct.y + 1 : ct.y;
    return { state: "OFF_SEASON", countdownTo: centralInstant(seasonYear, 4, 1, 12, 0) };
  }

  /* 2 · Target Monday + live window (Sat 12:00 PM → Mon 11:59 PM CT) */
  const inLiveWindow = (ct.wd === 6 && ct.hh >= 12) || ct.wd === 0 || ct.wd === 1;
  const daysToMonday = ct.wd === 1 ? 0 : (8 - ct.wd) % 7;
  const targetMonday = addDays(ct, daysToMonday);
  const targetMondayISO = iso(targetMonday);

  /* 3 · Look up the row for that Monday */
  const row = (rows || []).find(r => (r.ride_date || "").trim() === targetMondayISO);
  const status = (row?.status || "").trim().toLowerCase();

  // Saturday noon after the target Monday (the *following* plan drop)
  const satAfterMonday = addDays(targetMonday, 5);
  const followingSatNoon = centralInstant(satAfterMonday.y, satAfterMonday.mo, satAfterMonday.d, 12, 0);

  if (status === "weather_cancel")
    return { state: "WEATHER_CANCEL", row, note: row.note, countdownTo: followingSatNoon, targetMondayISO };
  if (status === "no_ride")
    return { state: "NO_RIDE", row, note: row.note, countdownTo: followingSatNoon, targetMondayISO };
  if (status === "scheduled" && inLiveWindow)
    return { state: "LIVE", row, targetMondayISO };

  /* 4 · Everything else → countdown to the next Saturday noon drop.
     (Also covers a missing row inside the live window — never broken.) */
  return { state: "COUNTDOWN", countdownTo: nextSaturdayNoon(now), targetMondayISO };
}

/* ── Fetch ───────────────────────────────────────────────────── */
/**
 * Loads ride rows. → { rows, fetchFailed }
 * No SHEET_URL yet → sample rows (prototype mode).
 * Fetch failure → empty rows + fetchFailed:true; the caller falls
 * back to COUNTDOWN with a "check our Instagram" line (§6.2).
 */
export async function fetchRides() {
  if (!SHEET_URL) return { rows: SAMPLE_ROWS, fetchFailed: false };
  try {
    const res = await fetch(SHEET_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { rows: parseCSV(await res.text()), fetchFailed: false };
  } catch (err) {
    console.warn("[rideState] Sheet fetch failed:", err);
    return { rows: [], fetchFailed: true };
  }
}

/** Split a sheet `plan` cell into timeline steps (real or literal \n). */
export function planSteps(planText) {
  return (planText || "")
    .split(/\r?\n|\\n/)
    .map(s => s.trim())
    .filter(Boolean);
}
