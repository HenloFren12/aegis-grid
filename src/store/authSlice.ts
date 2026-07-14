import { create } from 'zustand';

interface AuthState {
  staffId: string | null;
  role: 'organizer' | 'staff' | null;
  setAuth: (staffId: string | null, role: 'organizer' | 'staff' | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  staffId: null,
  role: null,
  setAuth: (staffId, role) => set({ staffId, role }),
}));