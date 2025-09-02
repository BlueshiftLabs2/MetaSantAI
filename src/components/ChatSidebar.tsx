import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  useSidebar 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ChatSession {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    model?: string;
    reactions?: string[];
    rating?: 'up' | 'down';
  }>;
  createdAt: Date;
  tags?: string[];
}

interface ChatSidebarProps {
  chats: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export const ChatSidebar = ({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat 
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Sidebar className="w-64 border-r border-sidebar-border bg-sidebar-background pt-14">
      <SidebarContent className="p-2 custom-scrollbar">
        {/* New Chat Button */}
        <div className="mb-4">
          <Button 
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
            variant="ghost"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Search Input */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
          <Input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/60"
          />
        </div>

        {/* Chat List */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider">
            Recent Chats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredChats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectChat(chat.id)}
                    className={`
                      group relative w-full justify-start text-left h-auto py-2 px-3
                      ${currentChatId === chat.id 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {truncateTitle(chat.title)}
                        </div>
                        <div className="text-xs text-sidebar-foreground/60 truncate">
                          {chat.messages.length} messages
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {chats.length === 0 && (
          <div className="text-center text-sidebar-foreground/60 text-sm mt-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No chats yet</p>
            <p className="text-xs">Start a new conversation</p>
          </div>
        )}
        
        {chats.length > 0 && filteredChats.length === 0 && searchQuery && (
          <div className="text-center text-sidebar-foreground/60 text-sm mt-8">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No chats found</p>
            <p className="text-xs">Try a different search term</p>
          </div>
        )}

      </SidebarContent>
    </Sidebar>
  );
};