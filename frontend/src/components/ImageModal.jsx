import { useEffect, useState } from 'react';
import styles from './ImageModal.module.css';

export default function ImageModal({ src, alt, onClose }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        // Close if clicking the backdrop, not the image
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className={styles.closeBtn} onClick={onClose} title="Close (Esc)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div
        className={`${styles.imageWrapper} ${zoomed ? styles.zoomed : ''}`}
        onClick={() => setZoomed(z => !z)}
      >
        <img
          src={src}
          alt={alt}
          className={styles.image}
          draggable={false}
        />
      </div>

      {!zoomed && (
        <div className={styles.hint}>Click image to zoom · Esc to close</div>
      )}
    </div>
  );
}