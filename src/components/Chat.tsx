import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { MessageActions } from './MessageActions';
import { useToast } from '@/hooks/use-toast';
import { AIService } from '@/lib/aiService';
import { Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  model?: string;
  reactions?: string[];
  rating?: 'up' | 'down';
}

interface ChatSettings {
  temperature: number;
  responseStyle: string;
  messageLimit: number;
  notifications: boolean;
}

interface ChatProps {
  chatId?: string;
  initialMessages?: Message[];
  settings?: ChatSettings;
  onMessagesUpdate?: (messages: Message[]) => void;
  systemPrompt?: string;
}

export const Chat = ({ chatId, initialMessages = [], settings, onMessagesUpdate, systemPrompt }: ChatProps = {}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Only auto-scroll for new complete messages, not during streaming
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  // Update messages when initialMessages prop changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setStreamingMessage('');
      
      // Create new abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      onMessagesUpdate?.(newMessages);

      let chatMessages = newMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // Add system prompt if provided
      if (systemPrompt) {
        chatMessages = [{ role: 'system' as any, content: systemPrompt }, ...chatMessages];
      }

      // Apply message limit if settings are provided
      const limitedMessages = settings?.messageLimit 
        ? chatMessages.slice(-settings.messageLimit) 
        : chatMessages;

      let assistantResponse = '';
      const assistantId = (Date.now() + 1).toString();

      await AIService.sendMessage(limitedMessages, (chunk) => {
        assistantResponse += chunk;
        setStreamingMessage(assistantResponse);
      }, controller, {
        temperature: settings?.temperature,
        responseStyle: settings?.responseStyle
      });

      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
        model: 'gpt-4',
      };
      
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      onMessagesUpdate?.(finalMessages);
      setStreamingMessage('');
      setIsLoading(false);
      setAbortController(null);

    } catch (error) {
      console.error('Error sending message:', error);
      if (settings?.notifications) {
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const stopMessage = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      
      // If we have a partial response, save it
      if (streamingMessage) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: streamingMessage,
        };
        
        const finalMessages = [...messages, assistantMessage];
        setMessages(finalMessages);
        onMessagesUpdate?.(finalMessages);
      }
      
      setStreamingMessage('');
    }
  };

  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'assistant') return;

    // Get all messages up to the one before this assistant message
    const messagesBeforeRegenerate = messages.slice(0, messageIndex);
    setMessages(messagesBeforeRegenerate);
    
    // Find the last user message to regenerate from
    const lastUserMessage = messagesBeforeRegenerate[messagesBeforeRegenerate.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await sendMessage(lastUserMessage.content);
    }
  };

  const deleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);
    onMessagesUpdate?.(updatedMessages);
  };

  const addReaction = (messageId: string, reaction: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const hasReaction = reactions.includes(reaction);
        return {
          ...msg,
          reactions: hasReaction 
            ? reactions.filter(r => r !== reaction)
            : [...reactions, reaction]
        };
      }
      return msg;
    });
    setMessages(updatedMessages);
    onMessagesUpdate?.(updatedMessages);
  };

  const rateMessage = (messageId: string, rating: 'up' | 'down') => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          rating: msg.rating === rating ? undefined : rating
        };
      }
      return msg;
    });
    setMessages(updatedMessages);
    onMessagesUpdate?.(updatedMessages);
  };

  return (
    <div className="flex flex-col h-full w-full mx-auto px-4">
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 space-y-6 max-w-4xl mx-auto w-full custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-foreground">What Can I Do For You</h2>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="group relative">
            <ChatMessage
              role={message.role}
              content={message.content}
            />
            <MessageActions
              message={message}
              onRegenerate={() => regenerateMessage(message.id)}
              onDelete={() => deleteMessage(message.id)}
              onReact={(reaction) => addReaction(message.id, reaction)}
              onRate={(rating) => rateMessage(message.id, rating)}
            />
          </div>
        ))}

        {isLoading && streamingMessage && (
          <ChatMessage
            role="assistant"
            content={streamingMessage}
            isStreaming={true}
          />
        )}

        {isLoading && !streamingMessage && (
          <div className="flex gap-4 animate-message-in">
            <div className="w-8 h-8 bg-gradient-primary rounded-full animate-pulse flex items-center justify-center p-1">
              <img src="/lovable-uploads/ab68e729-32e0-4450-b838-8a1de0e275ff.png" alt="AI Logo" className="w-full h-full object-contain" />
            </div>
            <div className="bg-gradient-card rounded-2xl rounded-bl-md p-4 border border-border/50">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="ml-2 text-xs text-muted-foreground">Sant is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/20 p-4 bg-gradient-card/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSendMessage={sendMessage} onStopMessage={stopMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};