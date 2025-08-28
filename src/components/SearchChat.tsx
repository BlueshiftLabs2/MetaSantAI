import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface SearchResult {
  chatId: string;
  chatTitle: string;
  messageId: string;
  messageContent: string;
  messageRole: 'user' | 'assistant';
  context: string;
}

interface SearchChatProps {
  chats: ChatSession[];
  onSelectResult: (chatId: string, messageId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SearchChat = ({ chats, onSelectResult, isOpen, onClose }: SearchChatProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchTimeout = setTimeout(() => {
      const searchResults: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      chats.forEach(chat => {
        chat.messages.forEach((message, index) => {
          const content = message.content.toLowerCase();
          if (content.includes(queryLower)) {
            // Get context (surrounding messages)
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(chat.messages.length - 1, index + 1);
            const contextMessages = chat.messages.slice(contextStart, contextEnd + 1);
            const context = contextMessages.map(m => 
              `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
            ).join(' | ');

            searchResults.push({
              chatId: chat.id,
              chatTitle: chat.title,
              messageId: message.id,
              messageContent: message.content,
              messageRole: message.role,
              context
            });
          }
        });
      });

      setResults(searchResults.slice(0, 50)); // Limit results
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, chats]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 p-4">
          {isSearching ? (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {query.trim() ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={`${result.chatId}-${result.messageId}-${index}`}>
                  <button
                    onClick={() => {
                      onSelectResult(result.chatId, result.messageId);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">
                        {result.chatTitle}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        result.messageRole === 'user' 
                          ? 'bg-chat-user text-chat-user-foreground' 
                          : 'bg-chat-ai text-chat-ai-foreground'
                      }`}>
                        {result.messageRole}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {highlightMatch(result.messageContent.substring(0, 200), query)}
                      {result.messageContent.length > 200 && '...'}
                    </p>
                    <div className="text-xs text-muted-foreground/70 border-t pt-2">
                      Context: {result.context}
                    </div>
                  </button>
                  {index < results.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};