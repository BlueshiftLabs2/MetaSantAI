import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp?: Date | number;
  model?: string;
}

export const ChatMessage = ({ role, content, isStreaming, timestamp, model }: ChatMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  
  useEffect(() => {
    if (role === 'assistant' && isStreaming) {
      setDisplayedContent(content);
    } else {
      setDisplayedContent(content);
    }
  }, [content, role, isStreaming]);

  const isUser = role === 'user';

  // Copy code function
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Enhanced format message with copy buttons
  const formatMessage = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let codeBlockIndex = 0;

    // Helper function to format inline text
    const formatInlineText = (text: string) => {
      return text
        // Bold **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Strikethrough ~~text~~
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Inline code `text`
        .replace(/`([^`]+)`/g, '<code class="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        // Links [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>')
        // Images ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-md my-2" />');
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Code blocks ```
      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.substring(3).trim();
        const codeLines = [];
        i++; // Skip opening ```
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        if (i < lines.length) i++; // Skip closing ```
        
        const codeText = codeLines.join('\n');
        const currentCodeIndex = codeBlockIndex++;

        elements.push(
          <div key={`code-${elements.length}`} className="relative group my-4">
            <div className="flex items-center justify-between bg-muted/30 px-4 py-2 rounded-t-md border border-border/30">
              {language && (
                <Badge variant="secondary" className="text-xs">
                  {language}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                onClick={() => copyToClipboard(codeText, currentCodeIndex)}
              >
                {copiedCode === currentCodeIndex ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <pre className="bg-muted/20 p-4 rounded-b-md border border-t-0 border-border/30 overflow-x-auto">
              <code className="text-sm font-mono leading-relaxed">{codeText}</code>
            </pre>
          </div>
        );
        continue;
      }

      // Tables
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        const tableLines = [];
        
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        if (tableLines.length >= 2) {
          const headerRow = tableLines[0];
          const separatorRow = tableLines[1];
          const dataRows = tableLines.slice(2);
          const headers = headerRow.split('|').slice(1, -1).map(h => h.trim());

          if (separatorRow.includes('-')) {
            elements.push(
              <Table key={`table-${elements.length}`} className="my-4">
                <TableHeader>
                  <TableRow>
                    {headers.map((header, idx) => (
                      <TableHead key={idx} dangerouslySetInnerHTML={{ 
                        __html: formatInlineText(header)
                      }} />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataRows.map((row, rowIdx) => {
                    const cells = row.split('|').slice(1, -1).map(c => c.trim());
                    return (
                      <TableRow key={rowIdx}>
                        {cells.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} dangerouslySetInnerHTML={{ 
                            __html: formatInlineText(cell)
                          }} />
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            );
            continue;
          }
        }
        
        i -= tableLines.length;
      }

      // Headers # to ######
      if (trimmedLine.match(/^#{1,6}\s/)) {
        const level = trimmedLine.match(/^(#{1,6})/)?.[1].length || 1;
        const headerText = trimmedLine.substring(level + 1);
        const formattedHeader = formatInlineText(headerText);
        
        const headerClasses = {
          1: "text-2xl font-bold mb-3 mt-6 first:mt-0",
          2: "text-xl font-semibold mb-2 mt-5 first:mt-0", 
          3: "text-lg font-semibold mb-2 mt-4 first:mt-0",
          4: "text-base font-semibold mb-2 mt-3 first:mt-0",
          5: "text-sm font-semibold mb-1 mt-3 first:mt-0",
          6: "text-xs font-semibold mb-1 mt-2 first:mt-0"
        }[level] || "text-base font-semibold mb-2 mt-3 first:mt-0";

        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeaderTag key={i} className={headerClasses} dangerouslySetInnerHTML={{ __html: formattedHeader }} />
        );
      }
      // Horizontal line ---
      else if (trimmedLine === '---' || trimmedLine === '___') {
        elements.push(<hr key={i} className="my-4 border-border" />);
      }
      // Blockquotes >
      else if (trimmedLine.startsWith('>')) {
        const quoteLines = [];
        
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          const quoteLine = lines[i].trim().substring(1).trim();
          quoteLines.push(quoteLine);
          i++;
        }
        i--; // Adjust for the extra increment
        
        elements.push(
          <blockquote key={`quote-${elements.length}`} className="border-l-4 border-primary/30 pl-4 py-2 my-3 bg-muted/20 italic rounded-r-md">
            {quoteLines.map((quoteLine, idx) => (
              <div key={idx} dangerouslySetInnerHTML={{ __html: formatInlineText(quoteLine) }} />
            ))}
          </blockquote>
        );
      }
      // Lists - and * for bullets, numbers for ordered
      else if (trimmedLine.match(/^[\-\*]\s/) || trimmedLine.match(/^\d+\.\s/)) {
        const listLines = [];
        const isOrdered = trimmedLine.match(/^\d+\.\s/);
        
        while (i < lines.length) {
          const currentLine = lines[i].trim();
          if (currentLine.match(/^[\-\*]\s/) || currentLine.match(/^\d+\.\s/) || currentLine.match(/^\s+[\-\*]\s/) || currentLine.match(/^\s+\d+\.\s/)) {
            listLines.push(lines[i]);
            i++;
          } else if (currentLine === '') {
            i++;
            if (i < lines.length && (lines[i].trim().match(/^[\-\*]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
              continue;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        i--; // Adjust for the extra increment
        
        const ListTag = isOrdered ? 'ol' : 'ul';
        const listItems = listLines
          .filter(line => line.trim())
          .map((listLine, idx) => {
            const indent = listLine.length - listLine.trimStart().length;
            const content = listLine.replace(/^[\s\-\*]|\d+\.\s/, '').trim();
            const isTask = content.match(/^\[[ x]\]\s/);
            
            if (isTask) {
              const isChecked = content.startsWith('[x]');
              const taskContent = content.substring(4);
              return (
                <li key={idx} className={`flex items-center gap-2 ${indent > 0 ? 'ml-4' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    readOnly 
                    className="rounded border-2 border-border"
                  />
                  <span 
                    className={isChecked ? 'line-through text-muted-foreground' : ''}
                    dangerouslySetInnerHTML={{ __html: formatInlineText(taskContent) }} 
                  />
                </li>
              );
            }
            
            return (
              <li key={idx} className={indent > 0 ? 'ml-4' : ''} dangerouslySetInnerHTML={{ 
                __html: formatInlineText(content) 
              }} />
            );
          });
        
        elements.push(
          <ListTag key={`list-${elements.length}`} className={`my-3 ${isOrdered ? 'list-decimal' : 'list-disc'} list-inside space-y-1`}>
            {listItems}
          </ListTag>
        );
      }
      // Regular text
      else if (trimmedLine !== '') {
        const formattedLine = formatInlineText(line);
        elements.push(
          <p key={i} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      }
      // Empty line
      else {
        elements.push(<br key={i} />);
      }
      
      i++;
    }

    return elements.filter(Boolean);
  };

  return (
    <div className={`flex gap-4 animate-message-in group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
        {isUser ? (
          <Avatar className="w-10 h-10 border-2 border-chat-user/20">
            <AvatarImage src="/placeholder-user.jpg" />
            <AvatarFallback className="bg-chat-user text-chat-user-foreground font-semibold">
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center overflow-hidden shadow-md">
            <img src="/lovable-uploads/653da4c0-914f-4133-a940-aef3fb615394.png" alt="AI Avatar" className="w-full h-full object-cover p-1" />
          </div>
        )}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message header with timestamp and model */}
        {!isUser && timestamp && (
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
            <span className="font-medium">Sant</span>
            <span>{(typeof timestamp === 'number' ? new Date(timestamp) : timestamp).toLocaleTimeString()}</span>
          </div>
        )}
        
        {isUser && timestamp && (
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
            <span>{(typeof timestamp === 'number' ? new Date(timestamp) : timestamp).toLocaleTimeString()}</span>
            <span className="font-medium">You</span>
          </div>
        )}

        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed break-words shadow-sm
            ${isUser 
              ? 'bg-gradient-to-r from-chat-user to-chat-user/90 text-chat-user-foreground rounded-br-md border border-chat-user/20' 
              : 'bg-gradient-card text-chat-ai-foreground rounded-bl-md border border-border/50'
            }
            ${isStreaming ? 'relative' : ''}
          `}
        >
          <div className="space-y-2">
            {formatMessage(displayedContent)}
          </div>
          {isStreaming && (
            <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse rounded-sm opacity-75" />
          )}
        </div>
      </div>
    </div>
  );
};