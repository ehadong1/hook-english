import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '../types';

const STORAGE_KEY = 'repeatflow-user-profile';

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile | null>(() => loadProfile());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const setProfile = useCallback((next: UserProfile) => {
    saveProfile(next);
    setProfileState(next);
  }, []);

  const resetProfile = useCallback(() => {
    clearProfile();
    setProfileState(null);
  }, []);

  return {
    profile,
    setProfile,
    resetProfile,
    isReady,
    hasProfile: profile !== null,
  };
}
