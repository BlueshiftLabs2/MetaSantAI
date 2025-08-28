import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Share2, Copy } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface ChatExportProps {
  chats: ChatSession[];
  currentChatId: string | null;
}

type ExportFormat = 'markdown' | 'json' | 'txt' | 'pdf';
type ExportScope = 'current' | 'all' | 'selected';

export const ChatExport = ({ chats, currentChatId }: ChatExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [scope, setScope] = useState<ExportScope>('current');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [shareableLink, setShareableLink] = useState('');
  const { toast } = useToast();

  const formatChatAsMarkdown = (chat: ChatSession) => {
    let markdown = `# ${chat.title}\n\n`;
    
    if (includeMetadata) {
      markdown += `**Created:** ${chat.createdAt.toLocaleString()}\n`;
      markdown += `**Messages:** ${chat.messages.length}\n\n`;
      markdown += `---\n\n`;
    }

    chat.messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      markdown += `## ${role}\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (index < chat.messages.length - 1) {
        markdown += `---\n\n`;
      }
    });

    return markdown;
  };

  const formatChatAsText = (chat: ChatSession) => {
    let text = `${chat.title}\n${'='.repeat(chat.title.length)}\n\n`;
    
    if (includeMetadata) {
      text += `Created: ${chat.createdAt.toLocaleString()}\n`;
      text += `Messages: ${chat.messages.length}\n\n`;
    }

    chat.messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'USER' : 'ASSISTANT';
      text += `${role}:\n${message.content}\n\n`;
      
      if (index < chat.messages.length - 1) {
        text += `${'-'.repeat(50)}\n\n`;
      }
    });

    return text;
  };

  const getChatsToExport = () => {
    switch (scope) {
      case 'current':
        return currentChatId ? chats.filter(c => c.id === currentChatId) : [];
      case 'all':
        return chats;
      case 'selected':
        return chats.filter(c => selectedChats.includes(c.id));
      default:
        return [];
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const chatsToExport = getChatsToExport();
    
    if (chatsToExport.length === 0) {
      toast({
        title: 'No chats selected',
        description: 'Please select chats to export.',
        variant: 'destructive',
      });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = chatsToExport.length === 1 
      ? `${chatsToExport[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}`
      : `chat_export_${timestamp}`;

    try {
      switch (format) {
        case 'markdown': {
          const content = chatsToExport.map(formatChatAsMarkdown).join('\n\n---\n\n');
          downloadFile(content, `${baseFilename}.md`, 'text/markdown');
          break;
        }
        
        case 'txt': {
          const content = chatsToExport.map(formatChatAsText).join('\n\n' + '='.repeat(80) + '\n\n');
          downloadFile(content, `${baseFilename}.txt`, 'text/plain');
          break;
        }
        
        case 'json': {
          const exportData = {
            exportDate: new Date().toISOString(),
            chats: chatsToExport.map(chat => ({
              ...chat,
              createdAt: chat.createdAt.toISOString()
            }))
          };
          downloadFile(JSON.stringify(exportData, null, 2), `${baseFilename}.json`, 'application/json');
          break;
        }
        
        case 'pdf': {
          // For PDF, we'll create HTML and let the user print to PDF
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Chat Export</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; border-bottom: 2px solid #333; }
                h2 { color: #666; margin-top: 30px; }
                .metadata { background: #f5f5f5; padding: 10px; border-radius: 5px; }
                .message { margin: 20px 0; padding: 15px; border-radius: 5px; }
                .user { background: #e3f2fd; }
                .assistant { background: #f3e5f5; }
                .divider { border-top: 1px solid #ddd; margin: 30px 0; }
              </style>
            </head>
            <body>
              ${chatsToExport.map(chat => `
                <h1>${chat.title}</h1>
                ${includeMetadata ? `
                  <div class="metadata">
                    <strong>Created:</strong> ${chat.createdAt.toLocaleString()}<br>
                    <strong>Messages:</strong> ${chat.messages.length}
                  </div>
                ` : ''}
                ${chat.messages.map(message => `
                  <div class="message ${message.role}">
                    <h3>${message.role === 'user' ? 'User' : 'Assistant'}</h3>
                    <p>${message.content.replace(/\n/g, '<br>')}</p>
                  </div>
                `).join('')}
                ${chatsToExport.length > 1 ? '<div class="divider"></div>' : ''}
              `).join('')}
            </body>
            </html>
          `;
          
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            newWindow.print();
          }
          break;
        }
      }

      toast({
        title: 'Export successful',
        description: `${chatsToExport.length} chat(s) exported as ${format.toUpperCase()}.`,
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your chats.',
        variant: 'destructive',
      });
    }
  };

  const generateShareableLink = () => {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;

    // Create a simplified version for sharing
    const shareData = {
      title: currentChat.title,
      messages: currentChat.messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };

    const encodedData = btoa(JSON.stringify(shareData));
    const link = `${window.location.origin}${window.location.pathname}?shared=${encodedData}`;
    setShareableLink(link);

    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Link copied',
        description: 'Shareable link copied to clipboard.',
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Chats
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Scope */}
          <div>
            <label className="text-sm font-medium">Export Scope</label>
            <Select value={scope} onValueChange={(value: ExportScope) => setScope(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Chat</SelectItem>
                <SelectItem value="all">All Chats</SelectItem>
                <SelectItem value="selected">Selected Chats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Chats */}
          {scope === 'selected' && (
            <div>
              <label className="text-sm font-medium">Select Chats</label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {chats.map(chat => (
                  <div key={chat.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={chat.id}
                      checked={selectedChats.includes(chat.id)}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setSelectedChats(prev => [...prev, chat.id]);
                        } else {
                          setSelectedChats(prev => prev.filter(id => id !== chat.id));
                        }
                      }}
                    />
                    <label htmlFor={chat.id} className="text-sm cursor-pointer">
                      {chat.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Format */}
          <div>
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(value: ExportFormat) => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="pdf">PDF (Print)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Metadata */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metadata"
              checked={includeMetadata}
              onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
            />
            <label htmlFor="metadata" className="text-sm cursor-pointer">
              Include metadata (dates, message counts)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleExport} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Shareable Link */}
          {currentChatId && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Share Current Chat</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateShareableLink}
                  className="gap-2"
                >
                  <Share2 className="w-3 h-3" />
                  Generate Link
                </Button>
              </div>
              
              {shareableLink && (
                <div className="flex gap-2">
                  <input
                    value={shareableLink}
                    readOnly
                    className="flex-1 px-2 py-1 text-xs bg-muted rounded border"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(shareableLink)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};