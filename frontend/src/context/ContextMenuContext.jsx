import { createContext, useContext, useState, useCallback } from 'react';
import ContextMenu from '../components/ContextMenu';

const ContextMenuContext = createContext(null);

export function ContextMenuProvider({ children }) {
  const [menu, setMenu] = useState(null);

  const showContextMenu = useCallback((e, items) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const hideContextMenu = useCallback(() => setMenu(null), []);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu }}>
      {children}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={hideContextMenu}
        />
      )}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  return useContext(ContextMenuContext);
}