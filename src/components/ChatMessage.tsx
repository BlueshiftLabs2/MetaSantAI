import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bot, User } from 'lucide-react';

const formatMessage = (content: string) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

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
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
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
      
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-muted p-4 rounded-md my-3 overflow-x-auto">
          <code className="text-sm font-mono">{codeLines.join('\n')}</code>
        </pre>
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
        <blockquote key={`quote-${elements.length}`} className="border-l-4 border-primary pl-4 py-2 my-3 bg-muted/30 italic">
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
        <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: formattedLine }} />
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

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  
  useEffect(() => {
    if (role === 'assistant' && isStreaming) {
      setDisplayedContent(content);
    } else {
      setDisplayedContent(content);
    }
  }, [content, role, isStreaming]);

  const isUser = role === 'user';

  return (
    <div className={`flex gap-4 animate-message-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
        {isUser ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src="/placeholder-user.jpg" />
            <AvatarFallback className="bg-chat-user text-chat-user-foreground">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center overflow-hidden">
            <img src="/lovable-uploads/653da4c0-914f-4133-a940-aef3fb615394.png" alt="AI Logo" className="w-full h-full object-cover rounded-full" />
          </div>
        )}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed break-words
            ${isUser 
              ? 'bg-chat-user text-chat-user-foreground rounded-br-md' 
              : 'bg-gradient-card text-chat-ai-foreground rounded-bl-md border border-border/50'
            }
            ${isStreaming ? 'relative' : ''}
          `}
        >
          <div className="space-y-1">
            {formatMessage(displayedContent)}
          </div>
          {isStreaming && (
            <span className="inline-block w-2 h-5 ml-1 bg-primary animate-typing rounded-sm opacity-75" />
          )}
        </div>
      </div>
    </div>
  );
};