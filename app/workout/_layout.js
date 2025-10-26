// app/workout/_layout.js
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="exercise-picker" />
      <Stack.Screen name="review" />
      <Stack.Screen name="active" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
