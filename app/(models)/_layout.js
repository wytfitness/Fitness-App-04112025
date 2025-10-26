import { Stack } from "expo-router";

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",          // iOS-style modal
        animation: "slide_from_bottom", // nice sheet-like motion
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}