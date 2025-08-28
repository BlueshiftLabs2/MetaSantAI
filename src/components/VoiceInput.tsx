import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput = ({ onTranscript, disabled }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognition = useRef<any>(null);
  const { toast } = useToast();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      toast({
        title: 'Voice input not supported',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      recognition.current.onstart = () => {
        setIsListening(true);
      };

      recognition.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (event.results[event.results.length - 1].isFinal) {
          onTranscript(transcript);
          stopListening();
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: 'Voice input error',
          description: `Speech recognition failed: ${event.error}`,
          variant: 'destructive',
        });
        stopListening();
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };

      recognition.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast({
        title: 'Voice input failed',
        description: 'Failed to start voice input.',
        variant: 'destructive',
      });
    }
  };

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "ghost"}
      size="icon"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`transition-colors ${
        isListening 
          ? 'bg-destructive text-destructive-foreground animate-pulse' 
          : 'hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}