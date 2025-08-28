import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  shortcuts: Array<{
    keys: string[];
    action: string;
    mac?: string[];
  }>;
}

export const KeyboardShortcutsHelp = ({ shortcuts = [] }: KeyboardShortcutsHelpProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const renderKeys = (keys: string[], macKeys?: string[]) => {
    const displayKeys = isMac && macKeys ? macKeys : keys;
    
    return (
      <div className="flex items-center gap-1">
        {displayKeys.map((key, index) => (
          <div key={index} className="flex items-center gap-1">
            <Badge variant="outline" className="font-mono text-xs px-2 py-1">
              {key}
            </Badge>
            {index < displayKeys.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Speed up your workflow with these keyboard shortcuts
          </div>

          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">{shortcut.action}</span>
                {renderKeys(shortcut.keys, shortcut.mac)}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isMac ? <Command className="w-3 h-3" /> : <span className="font-mono">Ctrl</span>}
              <span>
                {isMac 
                  ? 'Cmd key is used for most shortcuts on Mac' 
                  : 'Ctrl key is used for most shortcuts on Windows/Linux'
                }
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};