import { create } from "zustand";
import { supabase } from "../utils/supabaseClient";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      // Handle invalid refresh token
      if (
        error.message?.includes("refresh_token") ||
        error.code === "refresh_token_not_found"
      ) {
        await supabase.auth.signOut();
      }
      throw error;
    }
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw error;
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      set({ user: null });
    }
  },

  initialize: async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        set({ user: null, loading: false });
        return;
      }

      // Set initial user
      set({ user: session?.user || null });

      // Listen auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN") {
          set({ user: session?.user || null });
        } else if (event === "SIGNED_OUT") {
          set({ user: null });
        } else if (event === "TOKEN_REFRESHED") {
          set({ user: session?.user || null });
        }
      });

      set({ loading: false });

      // Cleanup
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error("Auth init error:", error);
      set({ user: null, loading: false });
    }
  },
}));
