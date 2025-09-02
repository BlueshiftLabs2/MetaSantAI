import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopMessage?: () => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, onStopMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading && onStopMessage) {
      onStopMessage();
    } else if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading}
          className="min-h-[52px] max-h-32 resize-none bg-card/50 border-border/30 focus:border-primary/50 focus:ring-primary/20 px-4 rounded-2xl backdrop-blur-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground"
          rows={1}
        />
      </div>
      <Button
        type="submit"
        disabled={!message.trim() && !isLoading}
        className="h-12 w-12 p-0 bg-gradient-primary hover:shadow-glow hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 rounded-xl"
      >
        {isLoading ? (
          <Square className="w-5 h-5" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </Button>
    </form>
  );
};