import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Account } from "@/types/database";

interface AuthState {
  user: User | null;
  account: Account | null;
  loading: boolean;
  pseudonym: string | null;

  setUser: (user: User | null) => void;
  setAccount: (account: Account | null) => void;
  setLoading: (loading: boolean) => void;
  setPseudonym: (pseudonym: string | null) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  account: null,
  loading: true,
  pseudonym: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initialState,

  setUser: (user) =>
    set({ user, pseudonym: user?.user_metadata?.pseudonym ?? null }),

  setAccount: (account) =>
    set({ account, pseudonym: account?.pseudonym ?? null }),

  setLoading: (loading) => set({ loading }),

  setPseudonym: (pseudonym) => set({ pseudonym }),

  reset: () => set(initialState),
}));
