// app/(auth)/signup.js
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { colors, spacing } from "../../lib/theme";
import { useAuth } from "../../stores/auth";

export default function Signup() {
  const router = useRouter();
  const { signUp, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [info, setInfo] = useState(null);

  const onSignup = async () => {
    setLocalError(null);
    setInfo(null);
    if (!email || !password || !confirm) {
      setLocalError("Please fill all fields.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(email.trim(), password);
    setLoading(false);

    if (error) return; // authError will render below

    // If your project requires email confirmation, no session is returned yet.
    if (data?.session) {
      // Session exists -> go straight to onboarding (or to /(tabs) if you prefer)
      router.replace("/(onboarding)/permissions");
    } else {
      // No session yet -> tell them to confirm email, then log in
      setInfo("Check your email to confirm your account, then log in.");
      // Optionally route to login automatically:
      // router.replace("/(auth)/login");
    }
  };

  const err = localError || authError;

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding" })} style={s.wrap}>
      <Text style={s.title}>Create your account</Text>
      <Text style={s.sub}>Let’s get you set up</Text>

      <Input
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Input
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      <Button title={loading ? "Creating…" : "Sign Up"} onPress={onSignup} disabled={loading} />
      {loading ? <ActivityIndicator style={{ marginTop: spacing(1) }} /> : null}
      {err ? <Text style={s.error}>{String(err)}</Text> : null}
      {info ? <Text style={s.info}>{info}</Text> : null}

      <Text style={s.footer}>
        Already have an account?{" "}
        <Link href="/(auth)/login" style={{ color: colors.primary }}>
          Sign in
        </Link>
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing(2), justifyContent: "center", backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  sub: { color: colors.textMuted, textAlign: "center", marginBottom: spacing(2) },
  footer: { color: colors.textMuted, textAlign: "center", marginTop: spacing(2) },
  error: { color: colors.danger, marginTop: spacing(1), textAlign: "center" },
  info: { color: colors.textMuted, marginTop: spacing(1), textAlign: "center" },
});
