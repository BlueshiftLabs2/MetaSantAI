import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewChat?: () => void;
  onSearch?: () => void;
  onToggleSidebar?: () => void;
  onSettings?: () => void;
  onExport?: () => void;
  onToggleTheme?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const isTyping = (e.target as HTMLElement)?.tagName === 'INPUT' || 
                      (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
                      (e.target as HTMLElement)?.contentEditable === 'true';

      // Ctrl/Cmd + key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            handlers.onNewChat?.();
            break;
          case 'k':
            e.preventDefault();
            handlers.onSearch?.();
            break;
          case 'b':
            e.preventDefault();
            handlers.onToggleSidebar?.();
            break;
          case ',':
            e.preventDefault();
            handlers.onSettings?.();
            break;
          case 'e':
            e.preventDefault();
            handlers.onExport?.();
            break;
          case 'd':
            e.preventDefault();
            handlers.onToggleTheme?.();
            break;
        }
      }

      // Escape key
      if (e.key === 'Escape' && !isTyping) {
        // Close any open dialogs or modals
        // This would need to be implemented based on your modal/dialog system
      }

      // Forward slash for search (like GitHub)
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        handlers.onSearch?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);

  // Return the shortcuts for display in help
  return {
    shortcuts: [
      { keys: ['Ctrl', 'N'], action: 'New Chat', mac: ['Cmd', 'N'] },
      { keys: ['Ctrl', 'K'], action: 'Search', mac: ['Cmd', 'K'] },
      { keys: ['/'], action: 'Search (alternative)' },
      { keys: ['Ctrl', 'B'], action: 'Toggle Sidebar', mac: ['Cmd', 'B'] },
      { keys: ['Ctrl', ','], action: 'Settings', mac: ['Cmd', ','] },
      { keys: ['Ctrl', 'E'], action: 'Export', mac: ['Cmd', 'E'] },
      { keys: ['Ctrl', 'D'], action: 'Toggle Theme', mac: ['Cmd', 'D'] },
      { keys: ['Esc'], action: 'Close Dialogs' },
    ]
  };
};