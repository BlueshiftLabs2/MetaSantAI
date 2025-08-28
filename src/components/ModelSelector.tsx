import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';

interface ModelSelectorProps {
  location: 'header' | 'chat-center';
}

export const ModelSelector = ({ location }: ModelSelectorProps) => {
  const baseClasses = location === 'header' 
    ? "text-lg font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    : "text-xs font-medium text-muted-foreground hover:bg-accent/50 h-6 px-2 py-1";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`${baseClasses} flex items-center gap-1`}>
          Sant 1.0
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-popover border border-border z-50" 
        side="top"
        align="start"
        sideOffset={4}
        avoidCollisions={true}
      >
        <DropdownMenuItem disabled className="text-muted-foreground">
          Models coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};