import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Zap, Code, FileText, Lightbulb, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
}

interface PromptTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

const defaultTemplates: Template[] = [
  {
    id: '1',
    name: 'Code Review',
    description: 'Review code for bugs, performance, and best practices',
    prompt: 'Please review the following code and provide feedback on:\n- Potential bugs or issues\n- Performance optimizations\n- Best practices and code quality\n- Security considerations\n\nCode:\n```\n[PASTE YOUR CODE HERE]\n```',
    category: 'Development',
    tags: ['code', 'review', 'debugging']
  },
  {
    id: '2',
    name: 'Explain Concept',
    description: 'Get a clear explanation of any concept',
    prompt: 'Please explain [CONCEPT] in a way that is:\n- Easy to understand\n- Includes practical examples\n- Covers the key points\n- Suitable for someone learning this topic',
    category: 'Education',
    tags: ['learning', 'explanation', 'concept']
  },
  {
    id: '3',
    name: 'Brainstorming',
    description: 'Generate creative ideas for any topic',
    prompt: 'I need creative ideas for [TOPIC]. Please provide:\n- 10 unique and innovative ideas\n- Brief explanation for each idea\n- Potential challenges and solutions\n- Which ideas have the most potential and why',
    category: 'Creative',
    tags: ['ideas', 'creative', 'brainstorm']
  },
  {
    id: '4',
    name: 'Debug Error',
    description: 'Help debug and fix programming errors',
    prompt: 'I\'m getting this error: [ERROR MESSAGE]\n\nHere\'s my code:\n```\n[PASTE CODE HERE]\n```\n\nPlease help me:\n- Understand what\'s causing the error\n- Provide a fix\n- Explain how to prevent similar issues',
    category: 'Development',
    tags: ['debug', 'error', 'fix']
  },
  {
    id: '5',
    name: 'Write Documentation',
    description: 'Create comprehensive documentation',
    prompt: 'Please create documentation for [FEATURE/FUNCTION/API]. Include:\n- Clear description of what it does\n- Parameters and return values\n- Usage examples\n- Common use cases\n- Best practices',
    category: 'Documentation',
    tags: ['docs', 'documentation', 'guide']
  }
];

export const PromptTemplates = ({ onSelectTemplate }: PromptTemplatesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('sant-ai-templates');
    return saved ? [...JSON.parse(saved), ...defaultTemplates] : defaultTemplates;
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    prompt: '',
    category: '',
    tags: ''
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { toast } = useToast();

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const saveTemplates = (updatedTemplates: Template[]) => {
    const customTemplates = updatedTemplates.filter(t => !defaultTemplates.find(dt => dt.id === t.id));
    localStorage.setItem('sant-ai-templates', JSON.stringify(customTemplates));
    setTemplates(updatedTemplates);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and prompt are required.',
        variant: 'destructive',
      });
      return;
    }

    const template: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      prompt: newTemplate.prompt,
      category: newTemplate.category || 'Custom',
      tags: newTemplate.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    saveTemplates([...templates, template]);
    setNewTemplate({ name: '', description: '', prompt: '', category: '', tags: '' });
    setIsCreating(false);
    
    toast({
      title: 'Template created',
      description: 'Your custom template has been saved.',
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (defaultTemplates.find(t => t.id === id)) {
      toast({
        title: 'Cannot delete',
        description: 'Default templates cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    saveTemplates(templates.filter(t => t.id !== id));
    toast({
      title: 'Template deleted',
      description: 'The template has been removed.',
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Development': return <Code className="w-4 h-4" />;
      case 'Creative': return <Lightbulb className="w-4 h-4" />;
      case 'Documentation': return <FileText className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="w-4 h-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Prompt Templates</span>
            <Button 
              onClick={() => setIsCreating(true)} 
              size="sm" 
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </DialogTitle>
        </DialogHeader>

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
            {filteredTemplates.map(template => (
              <div key={template.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(template.category)}
                    <h3 className="font-semibold">{template.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    {!defaultTemplates.find(t => t.id === template.id) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <Button 
                  onClick={() => {
                    onSelectTemplate(template);
                    setIsOpen(false);
                  }}
                  className="w-full"
                  size="sm"
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Create New Template Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Template name..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Development, Creative..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={newTemplate.tags}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Prompt *</label>
                <Textarea
                  value={newTemplate.prompt}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Your prompt template with [PLACEHOLDERS] for variable parts..."
                  rows={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateTemplate} className="flex-1">
                  Create Template
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
      </DialogContent>
    </Dialog>
  );
};