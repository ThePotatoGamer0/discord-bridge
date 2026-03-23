import { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    // Position adjustment — keep menu on screen
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rect.right > vw)  menu.style.left = `${x - rect.width}px`;
      if (rect.bottom > vh) menu.style.top  = `${y - rect.height}px`;
    }

    const handleClick    = () => onClose();
    const handleScroll   = () => onClose();
    const handleKey      = (e) => { if (e.key === 'Escape') onClose(); };

    window.addEventListener('click',    handleClick);
    window.addEventListener('scroll',   handleScroll, true);
    window.addEventListener('keydown',  handleKey);
    return () => {
      window.removeEventListener('click',   handleClick);
      window.removeEventListener('scroll',  handleScroll, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, x, y]);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.type === 'divider') {
          return <div key={i} className={styles.divider} />;
        }
        return (
          <button
            key={i}
            className={`${styles.item} ${item.danger ? styles.danger : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick?.();
              onClose();
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}