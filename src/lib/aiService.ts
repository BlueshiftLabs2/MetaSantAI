import { InferenceClient } from "@huggingface/inference";
import OpenAI from 'openai';

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
  private static readonly HUGGINGFACE_API_KEY = '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';
  private static readonly OPENROUTER_API_KEY = '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';
  private static readonly OPENROUTER_TIMEOUT = 45000; // 45 seconds timeout
  private static client: InferenceClient;
  private static openrouterClient: OpenAI;
  private static currentAbortController: AbortController | null = null;
  private static currentProvider: AIProvider = AIProvider.HUGGINGFACE;
  private static currentMode: 'normal' | 'judging' | 'openrouter' | 'puter' = 'normal';

  static getClient(): InferenceClient {
    if (!this.client) {
      this.client = new InferenceClient(this.HUGGINGFACE_API_KEY);
    }
    return this.client;
  }


  static getOpenRouterClient(): OpenAI {
    if (!this.openrouterClient) {
      this.openrouterClient = new OpenAI({
        apiKey: this.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true
      });
    }
    return this.openrouterClient;
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
          // Judging mode - only use HuggingFace
          try {
            const client = this.getClient();
            const stream = client.chatCompletionStream({
              provider: "together",
              model: "openai/gpt-oss-120b",
              messages: messagesWithSystem as any,
              temperature: options?.temperature || 0.7,
            });

            let out = "";
            for await (const chunk of stream) {
              // Check if request was aborted
              if (abortController?.signal.aborted) {
                throw new Error('Request aborted by user');
              }
              
              if (chunk.choices && chunk.choices.length > 0) {
                const newContent = chunk.choices[0].delta.content;
                if (newContent) {
                  out += newContent;
                  if (onChunk) {
                    // Add slight delay to make streaming more visible
                    await new Promise(resolve => setTimeout(resolve, 20));
                    onChunk(newContent);
                  }
                }
              }
            }
            
            this.currentProvider = AIProvider.HUGGINGFACE;
            return out;
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
          // OpenRouter mode - only use OpenRouter
          try {
            const result = await this.sendMessageWithOpenRouter(messagesWithSystem, onChunk, abortController, options);
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
            const client = this.getClient();
            const stream = client.chatCompletionStream({
              provider: "together",
              model: "openai/gpt-oss-120b",
              messages: messagesWithSystem as any,
              temperature: options?.temperature || 0.7,
            });

            let out = "";
            for await (const chunk of stream) {
              // Check if request was aborted
              if (abortController?.signal.aborted) {
                throw new Error('Request aborted by user');
              }
              
              if (chunk.choices && chunk.choices.length > 0) {
                const newContent = chunk.choices[0].delta.content;
                if (newContent) {
                  out += newContent;
                  if (onChunk) {
                    // Add slight delay to make streaming more visible
                    await new Promise(resolve => setTimeout(resolve, 20));
                    onChunk(newContent);
                  }
                }
              }
            }
            
            console.log('✅ HuggingFace request successful');
            this.currentProvider = AIProvider.HUGGINGFACE;
            return out;
          } catch (hfError: any) {
            console.error('❌ HuggingFace failed:', hfError);
            
            if (hfError instanceof Error && hfError.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            
            // Fallback to OpenRouter
            console.log('🔄 HuggingFace failed, trying OpenRouter...');
            try {
              const result = await this.sendMessageWithOpenRouter(messagesWithSystem, onChunk, abortController, options);
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
    // Ensure Puter is loaded
    if (!window.puter) {
      throw new Error('Puter SDK not loaded');
    }

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


  private static async sendMessageWithOpenRouter(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    const client = this.getOpenRouterClient();
    
    try {
      // Create a timeout promise to prevent getting stuck
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('OpenRouter request timeout after 45 seconds'));
        }, this.OPENROUTER_TIMEOUT);
      });

      // Race the API call against the timeout
      const streamPromise = client.chat.completions.create({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        stream: true,
        max_tokens: 4096
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]) as any;

      let out = "";
      let lastChunkTime = Date.now();
      
      for await (const chunk of stream) {
        // Check if request was aborted
        if (abortController?.signal.aborted) {
          throw new Error('Request aborted by user');
        }

        // Update last chunk time
        lastChunkTime = Date.now();
        
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          out += content;
          if (onChunk) {
            // Add slight delay to make streaming more visible
            await new Promise(resolve => setTimeout(resolve, 20));
            onChunk(content);
          }
        }

        // Check for streaming timeout (no chunks for 30 seconds)
        if (Date.now() - lastChunkTime > 30000) {
          throw new Error('OpenRouter streaming timeout - no response chunks received');
        }
      }
      
      return out;
    } catch (error: any) {
      if (error.message === 'Request aborted by user') {
        throw error;
      }
      
      // Check if it's a timeout error
      if (error.message.includes('timeout')) {
        console.warn('⏱️ OpenRouter timeout, will fallback to HuggingFace');
        const timeoutError = new Error('OpenRouter timeout - request took too long');
        (timeoutError as any).status = 408; // Request Timeout
        throw timeoutError;
      }
      
      const errorMessage = `OpenRouter API error: ${error.message || 'Unknown error'}`;
      const apiError = new Error(errorMessage);
      (apiError as any).status = error.status || 500;
      throw apiError;
    }
  }


  static stopCurrentRequest() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}