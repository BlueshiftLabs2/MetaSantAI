import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Bot, Edit, Trash2, Star, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  createdAt: Date;
}

interface SystemPromptsProps {
  currentPrompt?: SystemPrompt;
  onSelectPrompt: (prompt: SystemPrompt) => void;
}

const defaultPrompts: SystemPrompt[] = [
  {
    id: 'helpful-assistant',
    name: 'Helpful Assistant',
    description: 'A balanced, helpful AI assistant',
    prompt: 'You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and useful responses while being respectful and considerate.',
    category: 'General',
    isDefault: true,
    createdAt: new Date()
  },
  {
    id: 'code-expert',
    name: 'Code Expert',
    description: 'Specialized in programming and development',
    prompt: 'You are an expert software developer with deep knowledge across multiple programming languages and frameworks. Provide precise, well-documented code solutions with best practices. Always explain your code and suggest optimizations.',
    category: 'Development',
    isDefault: true,
    createdAt: new Date()
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Creative writing and storytelling assistant',
    prompt: 'You are a creative writing assistant with expertise in storytelling, character development, and various writing styles. Help craft compelling narratives, improve prose, and provide creative inspiration.',
    category: 'Creative',
    isDefault: true,
    createdAt: new Date()
  },
  {
    id: 'educator',
    name: 'Educator',
    description: 'Teaching and learning focused assistant',
    prompt: 'You are an experienced educator who excels at explaining complex concepts in simple terms. Use examples, analogies, and step-by-step breakdowns. Adapt your teaching style to the learner\'s level and provide practice opportunities.',
    category: 'Education',
    isDefault: true,
    createdAt: new Date()
  },
  {
    id: 'analyzer',
    name: 'Data Analyzer',
    description: 'Focused on analysis and insights',
    prompt: 'You are a data analyst with strong critical thinking skills. Analyze information thoroughly, identify patterns and trends, provide evidence-based insights, and present findings clearly with actionable recommendations.',
    category: 'Analysis',
    isDefault: true,
    createdAt: new Date()
  }
];

export const SystemPrompts = ({ currentPrompt, onSelectPrompt }: SystemPromptsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<SystemPrompt[]>(() => {
    const saved = localStorage.getItem('sant-ai-system-prompts');
    const customPrompts = saved ? JSON.parse(saved) : [];
    return [...defaultPrompts, ...customPrompts];
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    description: '',
    prompt: '',
    category: ''
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { toast } = useToast();

  const categories = ['All', ...Array.from(new Set(prompts.map(p => p.category)))];

  const filteredPrompts = selectedCategory === 'All' 
    ? prompts 
    : prompts.filter(p => p.category === selectedCategory);

  const savePrompts = (updatedPrompts: SystemPrompt[]) => {
    const customPrompts = updatedPrompts.filter(p => !p.isDefault);
    localStorage.setItem('sant-ai-system-prompts', JSON.stringify(customPrompts));
    setPrompts(updatedPrompts);
  };

  const handleCreatePrompt = () => {
    if (!newPrompt.name.trim() || !newPrompt.prompt.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and prompt are required.',
        variant: 'destructive',
      });
      return;
    }

    const prompt: SystemPrompt = {
      id: Date.now().toString(),
      name: newPrompt.name,
      description: newPrompt.description,
      prompt: newPrompt.prompt,
      category: newPrompt.category || 'Custom',
      createdAt: new Date()
    };

    savePrompts([...prompts, prompt]);
    setNewPrompt({ name: '', description: '', prompt: '', category: '' });
    setIsCreating(false);
    
    toast({
      title: 'System prompt created',
      description: 'Your custom system prompt has been saved.',
    });
  };

  const handleEditPrompt = () => {
    if (!editingPrompt) return;

    const updatedPrompts = prompts.map(p => 
      p.id === editingPrompt.id ? editingPrompt : p
    );
    savePrompts(updatedPrompts);
    setEditingPrompt(null);
    
    toast({
      title: 'Prompt updated',
      description: 'System prompt has been updated.',
    });
  };

  const handleDeletePrompt = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt?.isDefault) {
      toast({
        title: 'Cannot delete',
        description: 'Default prompts cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    savePrompts(prompts.filter(p => p.id !== id));
    toast({
      title: 'Prompt deleted',
      description: 'The system prompt has been removed.',
    });
  };

  const toggleFavorite = (id: string) => {
    const updatedPrompts = prompts.map(p => 
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    );
    savePrompts(updatedPrompts);
  };

  const copyPrompt = (prompt: SystemPrompt) => {
    navigator.clipboard.writeText(prompt.prompt).then(() => {
      toast({
        title: 'Copied',
        description: 'System prompt copied to clipboard.',
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bot className="w-4 h-4" />
          System Prompts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              System Prompts
            </span>
            <Button 
              onClick={() => setIsCreating(true)} 
              size="sm" 
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Prompt
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Current Prompt Display */}
        {currentPrompt && (
          <div className="mb-4 p-3 bg-accent/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current: {currentPrompt.name}</span>
              <Badge variant="secondary">{currentPrompt.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentPrompt.description}
            </p>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrompts.map(prompt => (
              <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      {prompt.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {prompt.isDefault && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(prompt.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Star className={`w-3 h-3 ${prompt.isFavorite ? 'text-yellow-500 fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPrompt(prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {!prompt.isDefault && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPrompt(prompt)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <CardDescription>{prompt.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {prompt.prompt.substring(0, 100)}...
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">{prompt.category}</Badge>
                    <Button 
                      onClick={() => {
                        onSelectPrompt(prompt);
                        setIsOpen(false);
                      }}
                      size="sm"
                      variant={currentPrompt?.id === prompt.id ? 'default' : 'outline'}
                    >
                      {currentPrompt?.id === prompt.id ? 'Current' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Create New Prompt Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New System Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Prompt name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Development, Creative..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">System Prompt *</label>
                <Textarea
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Define the AI's behavior, role, and guidelines..."
                  rows={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreatePrompt} className="flex-1">
                  Create Prompt
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Prompt Dialog */}
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit System Prompt</DialogTitle>
            </DialogHeader>
            {editingPrompt && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt(prev => 
                      prev ? { ...prev, name: e.target.value } : null
                    )}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={editingPrompt.description}
                    onChange={(e) => setEditingPrompt(prev => 
                      prev ? { ...prev, description: e.target.value } : null
                    )}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">System Prompt</label>
                  <Textarea
                    value={editingPrompt.prompt}
                    onChange={(e) => setEditingPrompt(prev => 
                      prev ? { ...prev, prompt: e.target.value } : null
                    )}
                    rows={6}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleEditPrompt} className="flex-1">
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingPrompt(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};