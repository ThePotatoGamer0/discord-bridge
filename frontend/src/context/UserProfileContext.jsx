import { createContext, useContext, useState, useCallback } from 'react';
import { apiUrl } from '../api';
import UserProfileModal from '../components/UserProfileModal';

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const openUserProfile = useCallback(async (userId, guildId) => {
    if (!userId || !guildId) return;
    setLoading(true);
    setProfile(null);
    try {
      const res = await fetch(apiUrl(`/members/${userId}/profile?guildId=${guildId}`), { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeUserProfile = useCallback(() => setProfile(null), []);

  return (
    <UserProfileContext.Provider value={{ openUserProfile, closeUserProfile }}>
      {children}
      {(profile || loading) && (
        <UserProfileModal
          profile={profile}
          loading={loading}
          onClose={closeUserProfile}
        />
      )}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
