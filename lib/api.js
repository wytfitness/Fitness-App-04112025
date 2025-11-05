// lib/api.js
import { supabase } from "./supabase";
export { supabase }; // allow imports from './api' as well

// --- Required envs
const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/** Fail fast with a clear message if envs are wrong */
function assertEnv() {
  if (!/^https?:\/\//.test(BASE)) {
    throw new Error("Missing/invalid EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!ANON) {
    console.warn("EXPO_PUBLIC_SUPABASE_ANON_KEY missing — some Functions may reject calls");
  }
}

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log("ACCESS TOKEN:", session?.access_token || "(no session)");
})();

/** Merge two AbortSignals into one */
function mergeSignals(a, b) {
  if (!a && !b) return undefined;
  if (a && !b) return a;
  if (!a && b) return b;
  const ctrl = new AbortController();
  const abort = () => !ctrl.signal.aborted && ctrl.abort();
  a.addEventListener("abort", abort);
  b.addEventListener("abort", abort);
  return ctrl.signal;
}

/** Authenticated fetch to Supabase Edge Functions (robust JSON + abort/timeout)
 *  Usage: authedFetch(path, { method, body, signal, timeoutMs })
 */
export async function authedFetch(
  path,
  { method = "GET", body, signal, timeoutMs = 15000 } = {}
) {
  assertEnv();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  // ✅ use the Functions subdomain
  const FN_BASE = BASE.includes(".functions.supabase.co")
    ? BASE
    : BASE.replace(".supabase.co", ".functions.supabase.co");

  const url = `${FN_BASE}/${path}`;

  // timeout support
  const timeoutCtrl = new AbortController();
  const tm = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const finalSignal = mergeSignals(signal, timeoutCtrl.signal);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: finalSignal,
    });
  } finally {
    clearTimeout(tm);
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  let json = null;
  if (ct.includes("application/json")) {
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      // fallthrough
    }
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text?.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!json) {
    throw new Error(
      `Expected JSON but got ${ct || "unknown"} from ${url}. Preview: ${
        text?.slice(0, 200) || "(empty)"
      }`
    );
  }
  return json;
}

/** For optional endpoints: swallow "not implemented/not found" into undefined */
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

/* -------------------- Small LRU cache for searches -------------------- */
const _searchCache = new Map(); // key -> items
const _CACHE_MAX = 60;
function cacheSet(k, v) {
  if (_searchCache.has(k)) _searchCache.delete(k);
  _searchCache.set(k, v);
  if (_searchCache.size > _CACHE_MAX) {
    const first = _searchCache.keys().next().value;
    _searchCache.delete(first);
  }
}

/** ---------- Food search (Edge Function) ---------- **/
async function searchFoods(q, limit = 25, { signal } = {}) {
  const query = (q || "").trim();
  if (!query) return [];
  return (
    await authedFetch(`food-search?q=${encodeURIComponent(query)}&limit=${limit}`, { signal })
  ).products ?? [];
}

/** ---------- Weight helpers ---------- **/
export async function latestWeight() {
  const j = await authedFetch(`user-api?action=weights&limit=1`);
  const arr = (Array.isArray(j) ? j : j.items ?? j.weights) ?? [];
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
    const arr = (Array.isArray(j) ? j : j.items ?? j.weights) ?? [];
    if (arr.length) return arr[0];
  } catch {
    // fall through to local filter
  }

  const j2 = await authedFetch(`user-api?action=weights&limit=50`);
  const arr2 = (Array.isArray(j2) ? j2 : j2.items ?? j2.weights) ?? [];
  if (!arr2.length) return null;

  const endTs = Date.parse(endOfDay);
  return (
    arr2
      .filter((w) => Date.parse(w.recorded_at) <= endTs)
      .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))[0] ?? null
  );
}

/** ---------- Barcode lookup (Edge Function) ---------- **/
async function lookupEAN(ean, { signal } = {}) {
  const j = await authedFetch(
    `nutrition-lookup?ean=${encodeURIComponent(ean)}`,
    { signal, timeoutMs: 12000 }
  );
  return j.product;
}

/** ---------- Public API surface ---------- **/
export const api = {
  // summaries / lists (dashboard is optional; others are required)
  dashboard: () => optional("user-api?action=dashboard"),
  mealsToday: () => authedFetch("user-api?action=meals-today"),
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
  logSet: (payload) =>
    optional("user-api?action=log-set", { method: "POST", body: payload }),
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

  // ---- Barcode & food search ----
  addMealItemFromProduct: (payload) =>
    optional("add-meal-item", { method: "POST", body: payload }),
  lookupEAN, // single correct export
  searchFoods, // cached + abortable

  // helpers
  latestWeight,
  weightOnDate,

  favoriteWorkouts: () => authedFetch("user-api?action=favorite-workouts"),
  saveFavoriteWorkout: (name, plan) =>
    authedFetch("user-api?action=save-favorite-workout", {
      method: "POST",
      body: { name, plan },
    }),

    upsertProfileAndGoals: (payload) =>
      authedFetch("user-api?action=upsert-profile-and-goals", {
        method: "POST",
        body: payload, // authedFetch will JSON.stringify it
      }),

   async getWeeklySummary() {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      return authedFetch(
        `user-api?action=weekly-summary&start=${encodeURIComponent(
          start.toISOString()
        )}&end=${encodeURIComponent(end.toISOString())}`
      );
    }, 
};
