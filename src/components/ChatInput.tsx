import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';
import { ModelSelector } from './ModelSelector';

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
          className="min-h-[44px] max-h-32 resize-none bg-gradient-card border-border/50 focus:border-primary/50 focus:ring-primary/20 pl-24"
          rows={1}
        />
        {/* Model Selector inside the text area on the left */}
        <div className="absolute bottom-2 left-2">
          <ModelSelector location="chat-center" />
        </div>
      </div>
      <Button
        type="submit"
        disabled={!message.trim() && !isLoading}
        className="h-11 w-11 p-0 bg-gradient-primary hover:shadow-glow transition-all duration-300 disabled:opacity-50"
      >
        {isLoading ? (
          <Square className="w-4 h-4" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
  );
};