import { InferenceClient } from "@huggingface/inference";
import OpenAI from 'openai';
import { supabase } from "@/integrations/supabase/client";

// Declare Puter as global since it's loaded via CDN
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (message: string, options: { model: string; stream: boolean }) => AsyncIterable<{ text?: string }>;
      };
    };
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  temperature?: number;
  responseStyle?: string;
}

enum AIProvider {
  HUGGINGFACE = 'huggingface',
  OPENROUTER = 'openrouter',
  PUTER = 'puter'
}

export class AIService {
  private static readonly OPENROUTER_TIMEOUT = 45000; // 45 seconds timeout
  private static client: InferenceClient;
  private static openrouterClient: OpenAI;
  private static currentAbortController: AbortController | null = null;
  private static currentProvider: AIProvider = AIProvider.HUGGINGFACE;
  private static currentMode: 'normal' | 'judging' | 'openrouter' | 'puter' = 'normal';

  // Legacy methods - no longer used but kept for compatibility
  static getClient(): InferenceClient {
    return null as any; // Not used anymore
  }

  static getOpenRouterClient(): OpenAI {
    return null as any; // Not used anymore
  }

  static setMode(mode: 'normal' | 'judging' | 'openrouter' | 'puter') {
    this.currentMode = mode;
  }

  static async sendMessage(
    messages: ChatMessage[], 
    onChunk?: (chunk: string) => void, 
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    console.log('🤖 AIService: Starting request with mode:', this.currentMode);
    
    // Store the current abort controller
    if (abortController) {
      this.currentAbortController = abortController;
    }

    // Create response style instructions based on settings
    const getResponseStyleInstruction = (style?: string) => {
      switch (style) {
        case 'creative':
          return 'Be creative and imaginative in your responses. Use analogies, examples, and think outside the box. Provide innovative solutions and explore alternative approaches.';
        case 'precise':
          return 'Be precise, direct, and technical. Provide exact solutions with minimal explanation. Focus on accuracy and efficiency.';
        case 'balanced':
        default:
          return 'Provide balanced responses that are both thorough and practical. Explain concepts clearly while being concise.';
      }
    };

    // Add system prompt to make AI act as a developer assistant
    const systemPrompt: ChatMessage = {
      role: 'assistant',
      content: `You are Sant, an AI model made by Alexander Mummert using the GPT OSS 120B open source model. You are a skilled developer assistant and coding expert. Your primary role is to:

• Help debug code issues and errors
• Provide code reviews and optimization suggestions  
• Explain programming concepts and best practices
• Assist with frontend/backend development questions
• Help troubleshoot build issues, dependency problems, and configuration
• Suggest modern development tools and approaches
• Provide clean, efficient code solutions
• Help with React, TypeScript, JavaScript, CSS, and web development

${getResponseStyleInstruction(options?.responseStyle)}

Keep responses concise but thorough. Always provide practical, actionable advice. Focus on modern best practices and clean code principles.`
    };

    const messagesWithSystem = [systemPrompt, ...messages];

    try {
      // Route to appropriate service based on mode
      switch (this.currentMode) {
        case 'judging':
          // Judging mode - only use HuggingFace via edge function
          try {
            const result = await this.sendMessageWithSupabase(messagesWithSystem, 'huggingface', onChunk, abortController);
            this.currentProvider = AIProvider.HUGGINGFACE;
            return result;
          } catch (error: any) {
            console.error('HuggingFace AI Service Error (Judging Mode):', error);
            if (error instanceof Error && error.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            const errorMessage = "⚠️ Hugging Face service is currently unavailable. Please try again in a moment.";
            if (onChunk) {
              onChunk(errorMessage);
            }
            return errorMessage;
          }


        case 'openrouter':
          // OpenRouter mode - only use OpenRouter via edge function
          try {
            const result = await this.sendMessageWithSupabase(messagesWithSystem, 'openrouter', onChunk, abortController, options);
            console.log('✅ OpenRouter request successful');
            this.currentProvider = AIProvider.OPENROUTER;
            return result;
          } catch (openrouterError: any) {
            console.error('❌ OpenRouter failed:', openrouterError);
            
            if (openrouterError instanceof Error && openrouterError.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            
            let errorMessage = "⚠️ OpenRouter AI service is currently unavailable";
            
            if (openrouterError?.message?.includes('timeout')) {
              errorMessage += " (request timeout)";
            }
            
            errorMessage += ". Please try again in a moment.";
            
            if (onChunk) {
              onChunk(errorMessage);
            }
            return errorMessage;
          }

        case 'puter':
          // Puter AI mode - use Claude Sonnet 4
          try {
            const result = await this.sendMessageWithPuter(messagesWithSystem, onChunk, abortController, options);
            console.log('✅ Puter AI request successful');
            this.currentProvider = AIProvider.PUTER;
            return result;
          } catch (puterError: any) {
            console.error('❌ Puter AI failed:', puterError);
            
            if (puterError instanceof Error && puterError.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            
            let errorMessage = "⚠️ Puter AI service is currently unavailable";
            
            if (puterError?.message?.includes('not loaded')) {
              errorMessage += " (SDK not loaded)";
            }
            
            errorMessage += ". Please try again in a moment.";
            
            if (onChunk) {
              onChunk(errorMessage);
            }
            return errorMessage;
          }

        default:
          // Normal mode with fallback: HuggingFace -> OpenRouter -> Puter AI
          console.log('🟡 Trying HuggingFace first...');
          try {
            const result = await this.sendMessageWithSupabase(messagesWithSystem, 'huggingface', onChunk, abortController);
            console.log('✅ HuggingFace request successful');
            this.currentProvider = AIProvider.HUGGINGFACE;
            return result;
          } catch (hfError: any) {
            console.error('❌ HuggingFace failed:', hfError);
            
            if (hfError instanceof Error && hfError.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            
            // Fallback to OpenRouter
            console.log('🔄 HuggingFace failed, trying OpenRouter...');
            try {
              const result = await this.sendMessageWithSupabase(messagesWithSystem, 'openrouter', onChunk, abortController, options);
              console.log('✅ OpenRouter fallback successful');
              this.currentProvider = AIProvider.OPENROUTER;
              return result;
            } catch (openrouterError: any) {
              console.error('❌ OpenRouter fallback failed:', openrouterError);
              
              if (openrouterError instanceof Error && openrouterError.message === 'Request aborted by user') {
                return "Response stopped by user.";
              }
              
              // Final fallback to Puter AI
              console.log('🔄 OpenRouter failed, trying Puter AI as final fallback...');
              try {
                const result = await this.sendMessageWithPuter(messagesWithSystem, onChunk, abortController, options);
                console.log('✅ Puter AI final fallback successful');
                this.currentProvider = AIProvider.PUTER;
                return result;
              } catch (puterError: any) {
                console.error('❌ All services failed including Puter AI:', puterError);
                
                if (puterError instanceof Error && puterError.message === 'Request aborted by user') {
                  return "Response stopped by user.";
                }
                
                let errorMessage = "⚠️ All AI services are currently unavailable:\n";
                
                // Provide specific error details
                if (hfError?.message?.includes('expired')) {
                  errorMessage += "• HuggingFace: Authentication token expired\n";
                } else {
                  errorMessage += "• HuggingFace: Service unavailable\n";
                }
                
                if (openrouterError?.message?.includes('timeout')) {
                  errorMessage += "• OpenRouter: Request timeout\n";
                } else {
                  errorMessage += "• OpenRouter: Connection failed\n";
                }
                
                if (puterError?.message?.includes('not loaded')) {
                  errorMessage += "• Puter AI: SDK not loaded\n";
                } else {
                  errorMessage += "• Puter AI: Service unavailable\n";
                }
                
                errorMessage += "\nPlease try again in a few minutes.";
                
                if (onChunk) {
                  onChunk(errorMessage);
                }
                return errorMessage;
              }
            }
          }
      }
    } finally {
      // Clear the abort controller
      this.currentAbortController = null;
    }
  }

  private static async sendMessageWithPuter(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    // Skip verification - proceed directly to Puter AI

    // Convert messages to single prompt for Puter AI
    const prompt = messages.map(msg => 
      msg.role === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`
    ).join('\n\n') + '\n\nAssistant:';

    const response = await window.puter.ai.chat(prompt, {
      model: 'openrouter:anthropic/claude-sonnet-4',
      stream: true
    });

    let out = "";
    for await (const part of response) {
      // Check if request was aborted
      if (abortController?.signal.aborted) {
        throw new Error('Request aborted by user');
      }
      
      if (part?.text) {
        out += part.text;
        if (onChunk) {
          // Add slight delay to make streaming more visible
          await new Promise(resolve => setTimeout(resolve, 20));
          onChunk(part.text);
        }
      }
    }

    return out;
  }


  private static async sendMessageWithSupabase(
    messages: ChatMessage[],
    provider: 'huggingface' | 'openrouter',
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    const functionName = provider === 'huggingface' ? 'chat-completion' : 'openrouter-chat';
    
    console.log(`🔧 Calling ${functionName} function with ${messages.length} messages`);
    
    // Add timeout to Supabase function call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function call timeout')), 10000); // 10 second timeout
    });
    
    try {
      console.log(`⏰ Starting ${functionName} with 10s timeout`);
      const result = await Promise.race([
        supabase.functions.invoke(functionName, {
          body: { 
            messages: messages,
            ...(provider === 'openrouter' && options?.temperature && { temperature: options.temperature })
          }
        }),
        timeoutPromise
      ]);
      
      const { data, error } = result as any;
      console.log(`📊 ${functionName} response:`, { data, error });

      if (error) {
        console.error(`❌ ${functionName} error:`, error);
        throw new Error(`${provider} API error: ${error.message}`);
      }

      // Handle non-streaming response (fallback)
      if (data && typeof data === 'object' && data.content) {
        console.log(`✅ Got non-streaming response from ${functionName}`);
        if (onChunk) {
          onChunk(data.content);
        }
        return data.content;
      }

      // If we get here, try streaming by calling the edge function directly
      console.log(`🔄 No direct response, trying streaming for ${functionName}`)
      const response = await fetch(`https://jhejkdfzjpnojuvoekxk.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZWprZGZ6anBub2p1dm9la3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzcyNTMsImV4cCI6MjA3MjQxMzI1M30.XLllt39cX0CUs_V0uMLRElKC5cvuwSAY_ce7I303sTU`,
        },
        body: JSON.stringify({ 
          messages: messages,
          provider: provider,
          ...(provider === 'openrouter' && options?.temperature && { temperature: options.temperature })
        }),
        signal: abortController?.signal
      });

      if (!response.ok) {
        throw new Error(`${provider} API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let out = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return out;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                out += parsed.content;
                if (onChunk) {
                  await new Promise(resolve => setTimeout(resolve, 20));
                  onChunk(parsed.content);
                }
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      return out;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Request aborted by user') {
        throw new Error('Request aborted by user');
      }
      
      const errorMessage = `${provider} error: ${error.message || 'Unknown error'}`;
      throw new Error(errorMessage);
    }
  }


  static stopCurrentRequest() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}