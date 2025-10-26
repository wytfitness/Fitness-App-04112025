import { api } from "../../lib/api";

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";

// Real API contract: POST /auth/login { email, password } -> { access_token, user }
async function realLogin({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // { access_token, user }
}

// Mock for now (so you can reach dashboard today)
function mockLogin({ email }) {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          access_token: "mock-token-" + Math.random().toString(36).slice(2),
          user: { id: "u_" + Date.now(), email, name: "Demo User" },
        }),
      600
    )
  );
}

export const AuthAPI = {
  login: (payload) => (USE_MOCKS ? mockLogin(payload) : realLogin(payload)),
};
