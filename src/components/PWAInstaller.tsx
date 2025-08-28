import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstaller = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isIOSStandalone);

    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install banner after a delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallDialog(true);
        }
      }, 30000); // Show after 30 seconds
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallDialog(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallDialog(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const dismissInstallDialog = () => {
    setShowInstallDialog(false);
    // Don't show again for this session
    sessionStorage.setItem('install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem('install-dismissed')) {
    return null;
  }

  return (
    <>
      {/* Install Button in Header */}
      {deferredPrompt && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInstallDialog(true)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Install App"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install Sant AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Get the best experience</CardTitle>
                <CardDescription>
                  Install Sant AI as an app for faster access and better performance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Download className="w-4 h-4 text-primary" />
                  <span>Faster loading</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Native app experience</span>
                </div>
              </CardContent>
            </Card>

            {isIOS ? (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  To install on iOS:
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Tap the Share button in Safari</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right corner</li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <div className="flex gap-2">
                <Button onClick={handleInstallClick} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                <Button variant="outline" onClick={dismissInstallDialog}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This app can be installed through your browser's install option.
                  Look for an install icon in your address bar.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};