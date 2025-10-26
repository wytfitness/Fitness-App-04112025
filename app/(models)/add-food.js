// app/(models)/add-food.js
import { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors, spacing } from "../../lib/theme";
import Card from "../../components/Card";
import { api } from "../../lib/api";

export default function AddFoodModal() {
  const router = useRouter();
  const { mealId: routeMealId } = useLocalSearchParams(); // may be undefined when opened from Dashboard

  const [mealId, setMealId] = useState(routeMealId ? String(routeMealId) : null);
  const [preppingMeal, setPreppingMeal] = useState(false);
  const insets = useSafeAreaInsets();
  // UI state: tabs
  const [tab, setTab] = useState("search"); // "search" | "barcode"

  // ===== Search tab state =====
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("100"); // grams
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searchErr, setSearchErr] = useState(null);

  // ===== Barcode tab state =====
  const [ean, setEan] = useState("");
  const [lookLoading, setLookLoading] = useState(false);
  const [lookErr, setLookErr] = useState(null);

  const didAutoFocus = useRef(false);

  // If no mealId passed, create a meal for today (snack)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (mealId) return;
      setPreppingMeal(true);
      try {
        const { meal } = await api.createMeal({ meal_type: "snack" });
        if (alive) setMealId(meal.id);
      } catch (e) {
        if (alive) setSearchErr("Could not create a meal. Please try again.");
      } finally {
        if (alive) setPreppingMeal(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mealId]);

  // Debounced search
  useEffect(() => {
    if (tab !== "search") return;
    const h = setTimeout(async () => {
      const term = (q || "").trim();
      if (term.length < 2) {
        setResults([]);
        setSearchErr(null);
        return;
      }
      try {
        setSearchLoading(true);
        setSearchErr(null);
        const rows = await api.searchFoods(term, 25); // <-- new API method
        setResults(rows || []);
      } catch (e) {
        setSearchErr(String(e?.message || e));
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [q, tab]);

  const addDisabled = useMemo(() => isNaN(Number(qty)) || Number(qty) <= 0, [qty]);

  async function onAdd(product) {
    try {
      if (!mealId) return;
      const grams = Math.max(1, Math.floor(Number(qty) || 0));
      await api.addMealItemFromProduct({
        meal_id: mealId,
        product,
        qty: grams,
        unit: "g",
      });
      Alert.alert("Added", `${product.name} (${grams}g)`);
      router.back(); // Diary screen refreshes via useFocusEffect
    } catch (e) {
      Alert.alert("Error", String(e?.message || e));
    }
  }

  // Barcode lookup → add 100g by default
  const lookup = async () => {
    if (!mealId || !ean) return;
    setLookLoading(true);
    setLookErr(null);
    try {
      const { product } = await api.lookupEAN(ean.trim());
      await api.addMealItemFromProduct({
        meal_id: mealId,
        product,
        qty: 100,
        unit: "g",
      });
      Alert.alert("Added", `${product.name} (100g)`);
      router.back();
    } catch (e) {
      setLookErr("Product not found. Try search or manual add.");
    } finally {
      setLookLoading(false);
    }
  };

  const renderRow = ({ item }) => {
    const cals = item?.nutrients?.calories ?? null;
    const protein = item?.nutrients?.protein_g ?? null;
    const carbs = item?.nutrients?.carbs_g ?? null;
    const fat = item?.nutrients?.fat_g ?? null;

    return (
      <Card style={s.cardRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={s.thumb} />
          ) : (
            <View style={[s.thumb, s.thumbPlaceholder]} />
          )}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.name}>{item.name}</Text>
            <Text numberOfLines={1} style={s.brand}>
              {(item.brand || "—") + " • "}{cals != null ? `${Math.round(cals)} kcal / 100g` : "kcal —"}
            </Text>
            <Text style={s.macros}>
              P {protein ?? "—"}g • C {carbs ?? "—"}g • F {fat ?? "—"}g
            </Text>
          </View>
        </View>
        <TouchableOpacity disabled={addDisabled} onPress={() => onAdd(item)} style={[s.addBtn, addDisabled && { opacity: 0.5 }]}>
          <Text style={s.addTxt}>Add</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={s.overlay} edges={["bottom"]}>
      <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
         <View style={[s.sheet, { paddingBottom: (insets.bottom ?? 0) + spacing(2) }]}>
        
        <View style={s.handle} />

        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.x}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>Add Food</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ paddingHorizontal: spacing(2) }}>
          {/* Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity onPress={() => setTab("search")} style={[s.tab, tab === "search" && s.tabActive]}>
              <Text style={[s.tabTxt, tab === "search" && s.tabTxtActive]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab("barcode")} style={[s.tab, tab === "barcode" && s.tabActive]}>
              <Text style={[s.tabTxt, tab === "barcode" && s.tabTxtActive]}>Barcode</Text>
            </TouchableOpacity>
          </View>

          {preppingMeal ? (
            <View style={{ alignItems: "center", paddingVertical: spacing(2) }}>
              <ActivityIndicator />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Preparing meal…</Text>
            </View>
          ) : tab === "search" ? (
            <>
              <FlatList
                data={results}
                keyExtractor={(it, i) => `${it.ean || it.name}-${i}`}
                renderItem={renderRow}
                ListHeaderComponent={
                  <View>
                    {/* Search + Qty (moved into header) */}
                    <TextInput
                      placeholder="Search foods (e.g., banana, oats, yogurt)…"
                      placeholderTextColor={colors.textMuted}
                      value={q}
                      onChangeText={setQ}
                      style={s.input}
                      autoFocus
                    />
                    <View style={s.qtyRow}>
                      <Text style={s.qtyLabel}>Qty (g)</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={qty}
                        onChangeText={setQty}
                        style={s.qtyInput}
                      />
                    </View>

                    {searchErr ? <Text style={s.err}>{searchErr}</Text> : null}
                    {searchLoading ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
                  </View>
                }
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListFooterComponent={
                  <View>
                    <Card style={{ marginTop: spacing(2), padding: spacing(1.25), alignItems: "center" }}>
                      <Text style={{ color: colors.textMuted, marginBottom: spacing(1) }}>
                        Can’t find it?
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: "/(models)/food-details", params: { mealId } })}
                        style={s.secondaryBtn}
                        disabled={!mealId}
                      >
                        <Text style={s.secondaryBtnTxt}>Add manually</Text>
                      </TouchableOpacity>
                    </Card>
                    {/* comfy space above the keyboard/safe-area */}
                    <View style={{ height: (insets.bottom ?? 0) + spacing(3) }} />
                  </View>
                }
                contentContainerStyle={{
                  paddingTop: spacing(1),
                  paddingBottom: spacing(2), // small; footer spacer handles the rest
                  paddingHorizontal: 0,
                }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
              />
            </>
          ) : (
            <>
              {/* Barcode mode */}
              <Text style={s.section}>Scan or enter a barcode (EAN)</Text>
              <TextInput
                placeholder="Enter EAN (e.g. 4008400402222)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={s.input}
                value={ean}
                onChangeText={setEan}
                onSubmitEditing={lookup}
              />
              <TouchableOpacity
                style={[s.primaryBtn, lookLoading && { opacity: 0.6 }]}
                onPress={lookup}
                disabled={lookLoading || !ean || !mealId}
              >
                {lookLoading ? (
                  <ActivityIndicator color={colors.bg} />
                ) : (
                  <Text style={s.primaryBtnTxt}>Lookup</Text>
                )}
              </TouchableOpacity>
              {lookErr ? <Text style={s.err}>{lookErr}</Text> : null}

              <Card style={{ marginTop: spacing(2), padding: spacing(1.25), alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, marginBottom: spacing(1) }}>
                  Can’t find it?
                </Text>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/(models)/food-details", params: { mealId } })}
                  style={s.secondaryBtn}
                  disabled={!mealId}
                >
                  <Text style={s.secondaryBtnTxt}>Add manually</Text>
                </TouchableOpacity>
              </Card>
            </>
          )}
        </View>
      </View>
       </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing(3),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(2),
  },
  x: { color: colors.textMuted, fontSize: 18 },
  title: { color: colors.text, fontWeight: "700", fontSize: 16, paddingVertical: spacing(1) },

  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing(1),
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabActive: { backgroundColor: colors.surface },
  tabTxt: { color: colors.textMuted, fontWeight: "700" },
  tabTxtActive: { color: colors.text },

  section: { color: colors.textMuted, marginBottom: spacing(1), marginTop: spacing(1) },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    marginTop: spacing(1),
  },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing(1), marginBottom: spacing(1) },
  qtyLabel: { color: colors.textMuted, width: 70 },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, gap: 10 },
  thumb: { width: 46, height: 46, borderRadius: 6, backgroundColor: "#222" },
  thumbPlaceholder: { borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: "700" },
  brand: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  macros: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addTxt: { color: colors.text, fontWeight: "700" },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing(1),
  },
  primaryBtnTxt: { color: colors.bg, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnTxt: { color: colors.text, fontWeight: "700" },
  err: { color: colors.danger, marginTop: spacing(1) },
});
