// lib/session-watcher.js
import { useEffect, useRef } from "react";
import { Alert, Platform, ToastAndroid, InteractionManager } from "react-native";
import { router, usePathname } from "expo-router";
import { supabase } from "./api"; // or "./supabase" if you prefer

// Put your most likely login paths first, adjust to match your files.
const LOGIN_CANDIDATES = [
  "/login",          // app/(auth)/login.js
  "/(auth)/login",   // sometimes works better programmatically
  "/(auth)",         // if you use app/(auth)/index.js
  "/auth/login",     // literal /auth folder (not a group)
  "/",               // last resort
];

const notify = (msg) =>
  Platform.OS === "android"
    ? ToastAndroid.show(msg, ToastAndroid.SHORT)
    : Alert.alert("Sign in required", msg);

const redirectToLogin = () => {
  InteractionManager.runAfterInteractions(() => {
    for (const path of LOGIN_CANDIDATES) {
      try {
        router.replace(path);
        console.log("[auth-watcher] redirect ->", path);
        return;
      } catch (_) {}
    }
    console.warn("[auth-watcher] No login route matched. Check your (auth) files.");
  });
};

const isAuthPath = (p = "") =>
  p.startsWith("/(auth)") || p.startsWith("/auth") || p.startsWith("/login");

export function useAuthWatcher() {
  // OK to use hooks here
  const pathname = usePathname();

  // Store the latest pathname in a ref so callbacks can read it WITHOUT hooks
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!supabase?.auth) {
      console.warn("[auth-watcher] Supabase client missing");
      return;
    }

    // Initial check on mount
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session && !isAuthPath(pathnameRef.current)) {
        notify("Your session ended. Please sign in again.");
        redirectToLogin();
      }
    });

    // Listen for sign-outs / expiration
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentPath = pathnameRef.current; // ← no hook here
      if (!session && !isAuthPath(currentPath)) {
        notify("Your session ended. Please sign in again.");
        redirectToLogin();
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);
}
