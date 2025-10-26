// app/(tabs)/_layout.js
import { Tabs } from "expo-router";
import { colors } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const name = route.name.replace(/\/index$/, ""); // "workout/index" -> "workout"
        const iconMap = {
          index: "grid-outline",
          food: "restaurant-outline",
          workout: "barbell-outline",
          history: "time-outline",
          progress: "trending-up-outline",
        };
        const iconName = iconMap[name] ?? "ellipse-outline";
        return {
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarLabelStyle: { fontSize: 12 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={iconName} size={size} color={color} />
          ),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="food" options={{ title: "Diary" }} />
      <Tabs.Screen
        name="workout/index"
        options={{ title: "Gym", tabBarLabel: "Gym" }}
      />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
    </Tabs>
  );
}
