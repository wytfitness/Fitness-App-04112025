// lib/goals.js
import { supabase } from "./supabase";

export const DEFAULT_GOALS = {
  calories: 2000,        // kcal/day
  carbs_pct: 40,         // %
  protein_pct: 30,       // %
  fat_pct: 30,           // %
  weight: 75,            // kg
  water_cups: 12,        // cups/day (250 ml)
  workout_days: 3,       // per week
};

async function uid() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

function rowsFromPayload(user_id, p) {
  const rows = [];
  const push = (goal_type, value, unit) => {
    if (value == null || Number.isNaN(Number(value))) return;
    rows.push({ user_id, goal_type, target_value: Number(value), unit: unit ?? null, end_date: null });
  };

  push("calories", p.calories, "kcal");
  push("carbs_pct", p.carbs_pct, "%");
  push("protein_pct", p.protein_pct, "%");
  push("fat_pct", p.fat_pct, "%");
  push("weight", p.weight, "kg");
  push("water_cups", p.water_cups, "cups");
  push("workout_days", p.workout_days, "days/week");
  return rows;
}

export async function getGoals() {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("goals")
    .select("goal_type,target_value,unit")
    .eq("user_id", user_id)
    .is("end_date", null);

  if (error) throw error;

  const g = { ...DEFAULT_GOALS };
  for (const r of data || []) {
    g[r.goal_type] = r.target_value;
  }
  return g;
}

export async function saveGoals(payload) {
  const user_id = await uid();
  const rows = rowsFromPayload(user_id, payload);

  // Manual upsert per goal type: delete active row (end_date is null), then insert
  for (const r of rows) {
    const { error: delErr } = await supabase
      .from("goals")
      .delete()
      .eq("user_id", user_id)
      .eq("goal_type", r.goal_type)
      .is("end_date", null);

    if (delErr) throw delErr;

    const { error: insErr } = await supabase.from("goals").insert(r);
    if (insErr) throw insErr;
  }

  return getGoals();
}
