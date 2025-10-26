// stores/auth.js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuth = create((set) => ({
  session: null,
  user: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false })
      supabase.auth.onAuthStateChange((_e, s) => set({ session: s, user: s?.user ?? null }))
    } catch (e) {
      set({ loading: false, error: e?.message ?? 'Auth init failed' })
    }
  },

  signIn: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message }); return { error } }
    set({ session: data.session, user: data.user })
    return { data }
  },

  signUp: async (email, password) => {
    set({ error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { set({ error: error.message }); return { error } }
    set({ session: data.session ?? null, user: data.user ?? null })
    return { data }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
}))
