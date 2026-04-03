import { create } from "zustand";
import { supabase } from "../utils/supabaseClient";

// Track pending requests to prevent concurrent calls
let signInPending = false;
let signUpPending = false;

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  subscription: null,

  signIn: async (email, password) => {
    if (signInPending) {
      throw new Error("Sign in already in progress");
    }

    signInPending = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      signInPending = false;
    }
  },

  signUp: async (email, password, fullName) => {
    if (signUpPending) {
      throw new Error("Sign up already in progress");
    }

    signUpPending = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) throw error;
      if (data?.user) set({ user: data.user });
    } finally {
      signUpPending = false;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  initialize: async () => {
    set({ loading: true });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({ user: session?.user || null });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user || null });
    });

    set({ subscription: data.subscription, loading: false });
  },

  cleanup: () => {
    const sub = get().subscription;
    if (sub) sub.unsubscribe();
  },
}));
