// lib/api.js
import { supabase } from "./supabase";

// --- Required envs
const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/** Tiny guard so we fail fast with a clear message */
function assertEnv() {
  if (!/^https?:\/\//.test(BASE)) {
    throw new Error("Missing/invalid EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!ANON) {
    // Not always required, but recommended for Functions; warn if absent.
    console.warn(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY missing — some Functions may reject calls"
    );
  }
}

/** Authenticated fetch to your Edge Functions */
export async function authedFetch(path, { method = "GET", body } = {}) {
  assertEnv();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not signed in");
  }

  const headers = {
    Authorization: `Bearer ${session.access_token}`, // user JWT
    apikey: ANON, // anon key for Functions
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}/functions/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text || "Request failed" };
  }
  if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
  return json;
}

/** For actions that might not exist yet on your Edge Function:
 *  return undefined instead of throwing on "Unknown action"/"Not implemented"/404-ish.
 */
async function optional(path, opts) {
  try {
    return await authedFetch(path, opts);
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (
      msg.includes("unknown action") ||
      msg.includes("not implemented") ||
      msg.includes("not found") ||
      (msg.includes("route") && msg.includes("not"))
    ) {
      return undefined;
    }
    throw e;
  }
}

/** ---------- Food search (Edge Function) ---------- **/
async function searchFoods(q, limit = 25) {
  if (!q?.trim()) return [];
  const j = await authedFetch(`food-search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return j.products ?? j.items ?? [];
}

/** ---------- Weight helpers ---------- **/
export async function latestWeight() {
  const j = await authedFetch(`user-api?action=weights&limit=1`);
  // Normalize: accept {items: [...]}, {weights: [...]}, or raw array
  const arr = (Array.isArray(j) ? j : (j.items ?? j.weights)) ?? [];
  return arr?.[0] ?? null;
}

export async function weightOnDate(date) {
  const isoDay =
    typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const endOfDay = `${isoDay}T23:59:59.999Z`;

  try {
    const j = await authedFetch(
      `user-api?action=weights&limit=1&before=${encodeURIComponent(endOfDay)}`
    );
    const arr = (Array.isArray(j) ? j : (j.items ?? j.weights)) ?? [];
    if (arr.length) return arr[0];
  } catch {
    // fall through to local filter
  }

  const j2 = await authedFetch(`user-api?action=weights&limit=50`);
  const arr2 = (Array.isArray(j2) ? j2 : (j2.items ?? j2.weights)) ?? [];
  if (!arr2.length) return null;

  const endTs = Date.parse(endOfDay);
  return (
    arr2
      .filter((w) => Date.parse(w.recorded_at) <= endTs)
      .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))[0] ?? null
  );
}

/** ---------- Public API surface ---------- **/
export const api = {
  // summaries / lists (dashboard is optional; others are required)
  dashboard: () => optional("user-api?action=dashboard"),
  mealsToday: () => authedFetch("user-api?action=meals-today"),
  // add near the other API methods
  mealsRange: (startISO, endISO) =>
    authedFetch(
      `user-api?action=meals-range&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
    ),
  weights: (limit = 30) => authedFetch(`user-api?action=weights&limit=${limit}`),
  workouts: (limit = 20) => authedFetch(`user-api?action=workouts&limit=${limit}`),

  // profile and extras used by Dashboard (optional)
  profile: () => optional("user-api?action=profile"),
  lastWorkout: () => optional("user-api?action=last-workout"),
  recommendedWorkouts: () => optional("user-api?action=recommended-workouts"),

  // daily activity (optional)
  stepsToday: () => optional("user-api?action=steps-today"),

  // water intake (optional)
  waterToday: () => optional("user-api?action=water-today"),
  addWater: (ml, at) =>
    optional("user-api?action=add-water", {
      method: "POST",
      body: { ml, at }, // "at" optional ISO string
    }),

  // mutations (meals/weight) — required
  createMeal: (payload) =>
    authedFetch("user-api?action=create-meal", { method: "POST", body: payload }),
  addMealItemManual: (payload) =>
    authedFetch("user-api?action=add-meal-item-manual", { method: "POST", body: payload }),
  addWeight: (weight_kg, recorded_at) =>
    authedFetch("user-api?action=add-weight", {
      method: "POST",
      body: { weight_kg, recorded_at },
    }),

  // ---- GYM (new flow) ---- (optional except log/finish that you use)
  startWorkout: (name) =>
    optional("user-api?action=start-workout", { method: "POST", body: { name } }),
  logSet: (payload) => optional("user-api?action=log-set", { method: "POST", body: payload }),
  finishWorkout: ({ session_id, notes, calories_burned }) =>
    optional("user-api?action=finish-workout", {
      method: "POST",
      body: { session_id, notes, calories_burned },
    }),
  workoutDetail: (id) =>
    optional(`user-api?action=workout-detail&id=${encodeURIComponent(id)}`),

  // optional exercise catalog
  searchExercises: (q, limit = 50) =>
    optional(`user-api?action=exercises&q=${encodeURIComponent(q)}&limit=${limit}`),

  // ---- Barcode flow (optional)
  lookupEAN: (ean) => optional(`nutrition-lookup?ean=${encodeURIComponent(ean)}`),
  addMealItemFromProduct: (payload) =>
    optional("add-meal-item", { method: "POST", body: payload }),

  // food search + helpers
  searchFoods,
  latestWeight,
  weightOnDate,
};
