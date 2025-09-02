import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, Cloud, Router, Brain } from 'lucide-react';

interface ModeSelectorProps {
  isOpen: boolean;
  onModeSelect: (mode: 'normal' | 'judging' | 'openrouter' | 'puter') => void;
}

export const ModeSelector = ({ isOpen, onModeSelect }: ModeSelectorProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="w-[90vw] max-w-md p-4">{/* No close button for mode selection */}
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Choose Your Mode</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
          <Button
            onClick={() => onModeSelect('normal')}
            variant="outline"
            className="w-full h-auto p-4 flex flex-col gap-2 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="font-semibold">Normal Mode</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight">
              HuggingFace → OpenRouter → Puter AI fallbacks
            </p>
            <Badge variant="secondary" className="text-xs">Recommended</Badge>
          </Button>

          <Button
            onClick={() => onModeSelect('judging')}
            variant="outline"
            className="w-full h-auto p-4 flex flex-col gap-2 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="font-semibold">Judging Mode</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight">
              Using the GPT OSS 120B model only
            </p>
            <Badge variant="outline" className="text-xs">Specialized</Badge>
          </Button>

          <Button
            onClick={() => onModeSelect('openrouter')}
            variant="outline"
            className="w-full h-auto p-4 flex flex-col gap-2 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Router className="w-4 h-4" />
              <span className="font-semibold">OpenRouter Mode</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight">
              Enhanced AI with OpenRouter only
            </p>
            <Badge variant="outline" className="text-xs">Premium Models</Badge>
          </Button>

          <Button
            onClick={() => onModeSelect('puter')}
            variant="outline"
            className="w-full h-auto p-4 flex flex-col gap-2 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="font-semibold">Puter AI Mode</span>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight">
              Claude Sonnet 4 via Puter AI with streaming
            </p>
            <Badge variant="outline" className="text-xs">Claude Sonnet 4</Badge>
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};