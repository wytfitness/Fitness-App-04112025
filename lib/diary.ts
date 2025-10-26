// lib/diary.ts
import { supabase } from "./supabase";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type Nutrients = {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
};

export type Product = {
  ean?: string | null;
  name: string;
  brand?: string | null;
  image?: string | null;
  nutrients?: Nutrients;
  source?: string | null;
};

export type Meal = {
  id: string;
  meal_type: MealType | null;
  eaten_at: string;
  notes?: string | null;
};

export type MealItem = {
  id: string;
  meal_id: string;
  food_name: string;
  qty?: number | null;
  unit?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  meta?: Record<string, unknown>;
};

export type MealsToday = (Meal & { meal_items?: MealItem[] })[];

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const FUNCS = `${SUPABASE_URL}/functions/v1`;

if (!SUPABASE_URL) console.warn("EXPO_PUBLIC_SUPABASE_URL is MISSING – Edge calls will fail.");

type HeaderMap = Record<string, string>;

async function authHeaders(): Promise<Record<string,string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn("No Supabase session – are you logged in?");
  }
  return {
    "content-type": "application/json",
    Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
  };
}

function normalizeType(input: string): MealType {
  const t = (input || "").toLowerCase().trim();
  if (t === "snacks") return "snack";
  if (t === "breakfast" || t === "lunch" || t === "dinner" || t === "snack") return t;
  return "snack";
}

function dayRangeISO(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Today (kept for convenience) */
export async function getMealsToday(): Promise<MealsToday> {
  const res = await fetch(`${FUNCS}/user-api?action=meals-today`, { headers: await authHeaders() });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to load meals");
  return j.meals as MealsToday;
}

/** Any specific date (uses the new meals-range action) */
export async function getMealsByDate(date: Date): Promise<MealsToday> {
  const { startISO, endISO } = dayRangeISO(date);
  const url = `${FUNCS}/user-api?action=meals-range&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;
  const res = await fetch(url, { headers: await authHeaders() });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to load meals");
  return j.meals as MealsToday;
}

export async function ensureMeal(type: string): Promise<Meal> {
  const meal_type = normalizeType(type);
  const res = await fetch(`${FUNCS}/user-api?action=ensure-meal-today`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ meal_type })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to ensure meal");
  return j.meal as Meal;
}

/** Create a meal on a specific date (used when adding on non-today pages) */
export async function createMealOn(date: Date, type: string): Promise<Meal> {
  const meal_type = normalizeType(type);
  const when = new Date(date);
  const res = await fetch(`${FUNCS}/user-api?action=create-meal`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ meal_type, eaten_at: when.toISOString() })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to create meal");
  return j.meal as Meal;
}

export async function addProductToMeal(
  meal_id: string,
  product: Product,
  qty: number = 100,
  unit: string = "g"
): Promise<MealItem> {
  const res = await fetch(`${FUNCS}/add-meal-item`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ meal_id, product, qty, unit })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Failed to add item");
  return j.item as MealItem;
}

export async function ensureAndAdd(type: string, product: Product, qty: number = 100): Promise<MealsToday> {
  const meal = await ensureMeal(type);
  await addProductToMeal(meal.id, product, qty);
  return await getMealsToday();
}

export function groupMealsByType(meals: MealsToday) {
  const groups: Record<MealType, MealItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };
  for (const m of meals || []) {
    const t = (m.meal_type ?? "snack") as MealType;
    const items = m.meal_items || [];
    for (const it of items) groups[t].push(it);
  }
  return groups;
}
