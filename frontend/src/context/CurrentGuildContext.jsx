import { createContext, useContext, useState } from 'react';

const CurrentGuildContext = createContext({ guildId: '', setGuildId: () => {} });

export function CurrentGuildProvider({ children }) {
  const [guildId, setGuildId] = useState('');
  return (
    <CurrentGuildContext.Provider value={{ guildId, setGuildId }}>
      {children}
    </CurrentGuildContext.Provider>
  );
}

export function useCurrentGuild() {
  return useContext(CurrentGuildContext);
}
