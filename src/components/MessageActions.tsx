import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, RotateCcw, Trash2, ThumbsUp, ThumbsDown, Heart, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reactions?: string[];
  rating?: 'up' | 'down';
}

interface MessageActionsProps {
  message: Message;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onReact?: (reaction: string) => void;
  onRate?: (rating: 'up' | 'down') => void;
}

export const MessageActions = ({ 
  message, 
  onRegenerate, 
  onDelete, 
  onReact, 
  onRate 
}: MessageActionsProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const reactions = ['👍', '👎', '❤️', '🎉', '🤔', '👀'];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>

        {/* Regenerate (only for assistant messages) */}
        {message.role === 'assistant' && onRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRegenerate}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate response</TooltipContent>
          </Tooltip>
        )}

        {/* Reactions */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReactions(!showReactions)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Heart className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add reaction</TooltipContent>
          </Tooltip>
          
          {showReactions && (
            <div className="absolute top-8 left-0 bg-popover border rounded-md shadow-lg p-2 flex gap-1 z-10">
              {reactions.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => {
                    onReact?.(reaction);
                    setShowReactions(false);
                  }}
                  className="text-lg hover:bg-accent rounded p-1 transition-colors"
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating (only for assistant messages) */}
        {message.role === 'assistant' && (
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRate?.('up')}
                  className={`h-7 w-7 p-0 ${message.rating === 'up' ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Good response</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRate?.('down')}
                  className={`h-7 w-7 p-0 ${message.rating === 'down' ? 'text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Poor response</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Delete */}
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete message</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};