import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, RotateCcw } from 'lucide-react';

interface ThemeCustomizerProps {
  onThemeChange?: (theme: CustomTheme) => void;
}

interface CustomTheme {
  primary: { h: number; s: number; l: number };
  secondary: { h: number; s: number; l: number };
  accent: { h: number; s: number; l: number };
  background: { h: number; s: number; l: number };
  foreground: { h: number; s: number; l: number };
  borderRadius: number;
  fontSize: number;
}

const defaultTheme: CustomTheme = {
  primary: { h: 262, s: 83, l: 58 },
  secondary: { h: 220, s: 14, l: 96 },
  accent: { h: 220, s: 14, l: 96 },
  background: { h: 0, s: 0, l: 100 },
  foreground: { h: 222, s: 84, l: 5 },
  borderRadius: 8,
  fontSize: 14,
};

export const ThemeCustomizer = ({ onThemeChange }: ThemeCustomizerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<CustomTheme>(defaultTheme);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('sant-ai-custom-theme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setTheme(parsed);
        applyTheme(parsed);
      } catch (error) {
        console.error('Failed to load custom theme:', error);
      }
    }
  }, []);

  const hslToString = (hsl: { h: number; s: number; l: number }) => {
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
  };

  const applyTheme = (customTheme: CustomTheme) => {
    const root = document.documentElement;
    
    root.style.setProperty('--primary', hslToString(customTheme.primary));
    root.style.setProperty('--secondary', hslToString(customTheme.secondary));
    root.style.setProperty('--accent', hslToString(customTheme.accent));
    root.style.setProperty('--background', hslToString(customTheme.background));
    root.style.setProperty('--foreground', hslToString(customTheme.foreground));
    root.style.setProperty('--radius', `${customTheme.borderRadius}px`);
    root.style.fontSize = `${customTheme.fontSize}px`;
  };

  const updateTheme = (updates: Partial<CustomTheme>) => {
    const newTheme = { ...theme, ...updates };
    setTheme(newTheme);
    
    if (previewMode) {
      applyTheme(newTheme);
    }
  };

  const updateColor = (colorKey: keyof CustomTheme, property: 'h' | 's' | 'l', value: number) => {
    const colorValue = theme[colorKey] as { h: number; s: number; l: number };
    updateTheme({
      [colorKey]: { ...colorValue, [property]: value }
    });
  };

  const saveTheme = () => {
    localStorage.setItem('sant-ai-custom-theme', JSON.stringify(theme));
    applyTheme(theme);
    onThemeChange?.(theme);
    setIsOpen(false);
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    applyTheme(defaultTheme);
    localStorage.removeItem('sant-ai-custom-theme');
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      applyTheme(theme);
    } else {
      // Reload original theme
      const savedTheme = localStorage.getItem('sant-ai-custom-theme');
      if (savedTheme) {
        try {
          applyTheme(JSON.parse(savedTheme));
        } catch {
          applyTheme(defaultTheme);
        }
      } else {
        applyTheme(defaultTheme);
      }
    }
  };

  const ColorSlider = ({ 
    colorKey, 
    property, 
    label, 
    min, 
    max 
  }: { 
    colorKey: keyof CustomTheme; 
    property: 'h' | 's' | 'l'; 
    label: string; 
    min: number; 
    max: number; 
  }) => {
    const colorValue = theme[colorKey] as { h: number; s: number; l: number };
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}: {colorValue[property]}{property === 'h' ? '°' : '%'}
        </Label>
        <Slider
          value={[colorValue[property]]}
          onValueChange={([value]) => updateColor(colorKey, property, value)}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Customizer
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Primary Color</CardTitle>
                  <CardDescription>Main accent color for buttons and highlights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorSlider colorKey="primary" property="h" label="Hue" min={0} max={360} />
                  <ColorSlider colorKey="primary" property="s" label="Saturation" min={0} max={100} />
                  <ColorSlider colorKey="primary" property="l" label="Lightness" min={0} max={100} />
                  <div 
                    className="w-full h-12 rounded border"
                    style={{ backgroundColor: `hsl(${hslToString(theme.primary)})` }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Background Color</CardTitle>
                  <CardDescription>Main background color</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorSlider colorKey="background" property="h" label="Hue" min={0} max={360} />
                  <ColorSlider colorKey="background" property="s" label="Saturation" min={0} max={100} />
                  <ColorSlider colorKey="background" property="l" label="Lightness" min={0} max={100} />
                  <div 
                    className="w-full h-12 rounded border"
                    style={{ backgroundColor: `hsl(${hslToString(theme.background)})` }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Accent Color</CardTitle>
                  <CardDescription>Secondary highlights and borders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorSlider colorKey="accent" property="h" label="Hue" min={0} max={360} />
                  <ColorSlider colorKey="accent" property="s" label="Saturation" min={0} max={100} />
                  <ColorSlider colorKey="accent" property="l" label="Lightness" min={0} max={100} />
                  <div 
                    className="w-full h-12 rounded border"
                    style={{ backgroundColor: `hsl(${hslToString(theme.accent)})` }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Text Color</CardTitle>
                  <CardDescription>Primary text color</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorSlider colorKey="foreground" property="h" label="Hue" min={0} max={360} />
                  <ColorSlider colorKey="foreground" property="s" label="Saturation" min={0} max={100} />
                  <ColorSlider colorKey="foreground" property="l" label="Lightness" min={0} max={100} />
                  <div 
                    className="w-full h-12 rounded border flex items-center justify-center"
                    style={{ 
                      backgroundColor: `hsl(${hslToString(theme.background)})`,
                      color: `hsl(${hslToString(theme.foreground)})`
                    }}
                  >
                    Sample Text
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Layout Settings</CardTitle>
                <CardDescription>Customize spacing and typography</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Border Radius: {theme.borderRadius}px</Label>
                  <Slider
                    value={[theme.borderRadius]}
                    onValueChange={([value]) => updateTheme({ borderRadius: value })}
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Font Size: {theme.fontSize}px</Label>
                  <Slider
                    value={[theme.fontSize]}
                    onValueChange={([value]) => updateTheme({ fontSize: value })}
                    min={12}
                    max={18}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Preview</CardTitle>
                <CardDescription>See your changes in real-time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={togglePreview} variant={previewMode ? "secondary" : "default"}>
                    {previewMode ? 'Stop Preview' : 'Live Preview'}
                  </Button>
                  <Button onClick={resetTheme} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg space-y-2"
                     style={{ 
                       backgroundColor: `hsl(${hslToString(theme.background)})`,
                       color: `hsl(${hslToString(theme.foreground)})`,
                       borderRadius: `${theme.borderRadius}px`
                     }}>
                  <h3 className="font-semibold">Preview Content</h3>
                  <p className="text-sm opacity-70">This shows how your theme will look</p>
                  <Button 
                    size="sm"
                    style={{ 
                      backgroundColor: `hsl(${hslToString(theme.primary)})`,
                      borderRadius: `${theme.borderRadius}px`
                    }}
                  >
                    Sample Button
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveTheme}>
            Save Theme
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};