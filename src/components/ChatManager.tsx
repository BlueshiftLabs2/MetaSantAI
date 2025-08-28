import { useState, useCallback, useEffect } from 'react';
import { ModelSelector } from './ModelSelector';
import { ModeSelector } from './ModeSelector';
import { Chat } from './Chat';
import { ChatSidebar, ChatSession } from './ChatSidebar';
import { SearchChat } from './SearchChat';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AIService } from '@/lib/aiService';

export const ChatManager = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('sant-ai-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('sant-ai-notifications');
    return saved ? JSON.parse(saved) : true;
  });
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('sant-ai-auto-save');
    return saved ? JSON.parse(saved) : true;
  });
  const [responseStyle, setResponseStyle] = useState(() => {
    const saved = localStorage.getItem('sant-ai-response-style');
    return saved || 'balanced';
  });
  const [messageLimit, setMessageLimit] = useState(() => {
    const saved = localStorage.getItem('sant-ai-message-limit');
    return saved ? [JSON.parse(saved)] : [100];
  });
  const [aiTemperature, setAiTemperature] = useState(() => {
    const saved = localStorage.getItem('sant-ai-temperature');
    return saved ? [JSON.parse(saved)] : [0.7];
  });
  const [showModeSelector, setShowModeSelector] = useState(() => 
    !localStorage.getItem('sant-ai-app-mode')
  );
  const [currentMode, setCurrentMode] = useState<'normal' | 'judging' | 'openrouter'>(() => {
    const saved = localStorage.getItem('sant-ai-app-mode') as 'normal' | 'judging' | 'openrouter' | 'clarifai';
    return saved === 'clarifai' ? 'normal' : (saved || 'normal');
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<string>('');
  const { toast } = useToast();

  // Apply dark mode on mount and when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sant-ai-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('sant-ai-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('sant-ai-auto-save', JSON.stringify(autoSave));
  }, [autoSave]);

  useEffect(() => {
    localStorage.setItem('sant-ai-response-style', responseStyle);
  }, [responseStyle]);

  useEffect(() => {
    localStorage.setItem('sant-ai-message-limit', JSON.stringify(messageLimit[0]));
  }, [messageLimit]);

  useEffect(() => {
    localStorage.setItem('sant-ai-temperature', JSON.stringify(aiTemperature[0]));
  }, [aiTemperature]);

  // Auto-save chats functionality
  useEffect(() => {
    if (autoSave && chats.length > 0) {
      localStorage.setItem('sant-ai-chats', JSON.stringify(chats));
    }
  }, [chats, autoSave]);

  // Load saved chats on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('sant-ai-chats');
    if (savedChats && autoSave) {
      try {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
      } catch (error) {
        console.error('Failed to load saved chats:', error);
      }
    }
  }, [autoSave]);

  const generateChatTitle = (firstMessage: string): string => {
    // Generate a title from the first message
    const title = firstMessage.slice(0, 50).replace(/\n/g, ' ').trim();
    return title || 'New Chat';
  };

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  }, []);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }

    toast({
      title: 'Chat deleted',
      description: 'The conversation has been removed.',
    });
  }, [currentChatId, chats, toast]);

  const updateChatMessages = useCallback((chatId: string, messages: any[], title?: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages, 
            title: title || chat.title 
          }
        : chat
    ));
  }, []);

  const getCurrentChat = () => {
    return chats.find(chat => chat.id === currentChatId) || null;
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: createNewChat,
    onSearch: () => setSearchOpen(true),
    onToggleSidebar: () => {}, // Will be handled by SidebarTrigger
    onSettings: () => setSettingsOpen(true),
    onExport: () => {},
    onToggleTheme: () => setDarkMode(!darkMode),
  });

  const handleModeSelect = (mode: 'normal' | 'judging' | 'openrouter') => {
    setCurrentMode(mode);
    setShowModeSelector(false);
    localStorage.setItem('sant-ai-app-mode', mode);
    AIService.setMode(mode);
  };

  // Create first chat if none exist
  useEffect(() => {
    if (chats.length === 0 && !currentChatId) {
      createNewChat();
    }
  }, [chats.length, currentChatId, createNewChat]);

  // Initialize AI service mode
  useEffect(() => {
    AIService.setMode(currentMode);
  }, [currentMode]);

  const currentChat = getCurrentChat();

  return (
    <>
      <ModeSelector 
        isOpen={showModeSelector} 
        onModeSelect={handleModeSelect} 
      />
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-bg custom-scrollbar">
        {/* Header with sidebar trigger */}
        <div className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between border-b border-sidebar-border bg-sidebar-background/95 backdrop-blur-sm z-20">
          <div className="flex items-center">
            <SidebarTrigger className="ml-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          </div>
          
          {/* Settings Dialog */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode" className="text-sm font-medium">
                    Dark Mode
                  </Label>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="text-sm font-medium">
                    Notifications
                  </Label>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>

                {/* Auto-save Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-save" className="text-sm font-medium">
                    Auto-save Chats
                  </Label>
                  <Switch
                    id="auto-save"
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  />
                </div>

                {/* AI Response Style */}
                <div className="space-y-2">
                  <Label htmlFor="response-style" className="text-sm font-medium">
                    AI Response Style
                  </Label>
                  <Select value={responseStyle} onValueChange={setResponseStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select response style" />
                    </SelectTrigger>
                    <SelectContent side="top" align="start">
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="precise">Precise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Message History Limit */}
                <div className="space-y-3">
                  <Label htmlFor="message-limit" className="text-sm font-medium">
                    Message History Limit: {messageLimit[0]}
                  </Label>
                  <Slider
                    id="message-limit"
                    min={10}
                    max={500}
                    step={10}
                    value={messageLimit}
                    onValueChange={setMessageLimit}
                    className="w-full"
                  />
                </div>

                {/* AI Temperature */}
                <div className="space-y-3">
                  <Label htmlFor="ai-temperature" className="text-sm font-medium">
                    AI Creativity: {aiTemperature[0].toFixed(1)}
                  </Label>
                  <Slider
                    id="ai-temperature"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={aiTemperature}
                    onValueChange={setAiTemperature}
                    className="w-full"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Dialog */}
        <SearchChat 
          chats={chats} 
          onSelectResult={(chatId) => selectChat(chatId)}
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
        />

        {/* Sidebar */}
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={selectChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
        />

        {/* Main chat area */}
        <main className="flex-1 flex flex-col pt-12">
          {currentChat ? (
            <Chat
              key={currentChat.id}
              chatId={currentChat.id}
              initialMessages={currentChat.messages}
              systemPrompt={currentSystemPrompt}
              settings={{
                temperature: aiTemperature[0],
                responseStyle,
                messageLimit: messageLimit[0],
                notifications
              }}
              onMessagesUpdate={(messages) => {
                // Auto-generate title from first user message if it's still "New Chat"
                let title = currentChat.title;
                if (title === 'New Chat' && messages.length > 0) {
                  const firstUserMessage = messages.find(m => m.role === 'user');
                  if (firstUserMessage) {
                    title = generateChatTitle(firstUserMessage.content);
                  }
                }
                updateChatMessages(currentChat.id, messages, title);
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-foreground">What Can I Do For You</h2>
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
    </>
  );
};