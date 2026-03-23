import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from '../components/EmojiPicker';

const EmojiPickerContext = createContext(null);

export function EmojiPickerProvider({ children }) {
  const [picker, setPicker] = useState(null);

  // anchorRect: DOMRect of the trigger element
  // onSelect: (emoji) => void  where emoji = { char, identifier, name }
  const showEmojiPicker = useCallback((anchorRect, onSelect) => {
    setPicker({ anchorRect, onSelect });
  }, []);

  const hideEmojiPicker = useCallback(() => setPicker(null), []);

  return (
    <EmojiPickerContext.Provider value={{ showEmojiPicker, hideEmojiPicker }}>
      {children}
      {picker && createPortal(
        <EmojiPicker
          anchorRect={picker.anchorRect}
          onSelect={(emoji) => { picker.onSelect(emoji); hideEmojiPicker(); }}
          onClose={hideEmojiPicker}
        />,
        document.body
      )}
    </EmojiPickerContext.Provider>
  );
}

export function useEmojiPicker() {
  return useContext(EmojiPickerContext);
}