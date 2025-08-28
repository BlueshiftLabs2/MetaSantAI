import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatTagsProps {
  chatId: string;
  tags: string[];
  onTagsChange: (chatId: string, tags: string[]) => void;
}

export const ChatTags = ({ chatId, tags = [], onTagsChange }: ChatTagsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const { toast } = useToast();

  // Load all existing tags from localStorage
  useEffect(() => {
    const savedTags = localStorage.getItem('sant-ai-all-tags');
    if (savedTags) {
      setAllTags(JSON.parse(savedTags));
    }
  }, []);

  const saveAllTags = (updatedTags: string[]) => {
    setAllTags(updatedTags);
    localStorage.setItem('sant-ai-all-tags', JSON.stringify(updatedTags));
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    const updatedTags = [...tags, trimmedTag];
    onTagsChange(chatId, updatedTags);

    // Add to global tags list if not exists
    if (!allTags.includes(trimmedTag)) {
      saveAllTags([...allTags, trimmedTag]);
    }

    setNewTag('');
    toast({
      title: 'Tag added',
      description: `Added tag "${trimmedTag}" to chat.`,
    });
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(chatId, updatedTags);
    
    toast({
      title: 'Tag removed',
      description: `Removed tag "${tagToRemove}" from chat.`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(newTag);
    }
  };

  const suggestedTags = allTags
    .filter(tag => !tags.includes(tag) && tag.includes(newTag.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Display existing tags */}
      {tags.map(tag => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="gap-1 hover:bg-destructive/10 transition-colors group"
        >
          <Tag className="w-3 h-3" />
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {/* Add new tag */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 h-6 text-xs"
          >
            <Plus className="w-3 h-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Add Tag</label>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tag name..."
                className="mt-1"
                autoFocus
              />
            </div>

            {/* Suggested tags */}
            {suggestedTags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Suggestions</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular tags */}
            {allTags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Popular Tags</label>
                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                  {allTags
                    .filter(tag => !tags.includes(tag))
                    .slice(0, 10)
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => addTag(newTag)} 
                size="sm" 
                className="flex-1"
                disabled={!newTag.trim()}
              >
                Add Tag
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};