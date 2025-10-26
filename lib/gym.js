// lib/gym.js
import { supabase } from "./supabase";

async function authedFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${path}`;
  const headers = { ...(opts.headers || {}), Authorization: `Bearer ${session?.access_token ?? ""}` };
  if (opts.body && typeof opts.body !== "string") {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { ...opts, headers });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || "Request failed");
  return txt ? JSON.parse(txt) : {};
}

export const gym = {
  // optional: once you add the exercises table + endpoint
  searchExercises: (q, limit = 50) =>
    authedFetch(`user-api?action=exercises&q=${encodeURIComponent(q)}&limit=${limit}`),

  startWorkout: (name) =>
    authedFetch("user-api?action=start-workout", { method: "POST", body: { name } }),

  logSet: (session_id, payload) =>
    authedFetch("user-api?action=log-set", { method: "POST", body: { session_id, ...payload } }),

  finishWorkout: (session_id, notes) =>
    authedFetch("user-api?action=finish-workout", { method: "POST", body: { session_id, notes } }),

  workoutDetail: (id) =>
    authedFetch(`user-api?action=workout-detail&id=${id}`),
};
