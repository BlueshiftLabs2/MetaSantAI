import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

interface NotificationManagerProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const NotificationManager = ({ enabled, onToggle }: NotificationManagerProps) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setIsSupported(false);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        onToggle(true);
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive chat notifications.',
        });
      } else {
        onToggle(false);
        toast({
          title: 'Notifications denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
      });
    }
  };

  const toggleNotifications = () => {
    if (permission === 'granted') {
      onToggle(!enabled);
      toast({
        title: enabled ? 'Notifications disabled' : 'Notifications enabled',
        description: enabled 
          ? 'You will no longer receive chat notifications.' 
          : 'You will now receive chat notifications.',
      });
    } else {
      requestPermission();
    }
  };

  const sendNotification = (title: string, body: string, icon?: string) => {
    if (enabled && permission === 'granted' && isSupported) {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          tag: 'sant-ai-chat',
          requireInteraction: false,
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Focus window when notification is clicked
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  };

  // Expose the sendNotification function globally
  useEffect(() => {
    (window as any).sendChatNotification = sendNotification;
    return () => {
      delete (window as any).sendChatNotification;
    };
  }, [enabled, permission, isSupported]);

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleNotifications}
      className={`text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        enabled ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    </Button>
  );
};

// Utility function to send notifications from anywhere in the app
export const sendChatNotification = (title: string, body: string, icon?: string) => {
  if ((window as any).sendChatNotification) {
    (window as any).sendChatNotification(title, body, icon);
  }
};