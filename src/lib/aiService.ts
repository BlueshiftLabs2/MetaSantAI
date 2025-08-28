import { InferenceClient } from "@huggingface/inference";
import OpenAI from 'openai';
import { Model, Input } from "clarifai-nodejs";

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
  GITHUB_MODELS = 'github_models',
  OPENROUTER = 'openrouter',
  CLARIFAI = 'clarifai'
}

export class AIService {
  private static readonly HUGGINGFACE_API_KEY = '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';
  private static readonly GITHUB_MODELS_TOKEN = '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';
  private static readonly OPENROUTER_API_KEY = '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';
  private static readonly CLARIFAI_PAT = '2c4a4*****'; // Replace with your actual PAT
  private static client: InferenceClient;
  private static githubClient: OpenAI;
  private static openrouterClient: OpenAI;
  private static clarifaiModel: Model;
  private static currentAbortController: AbortController | null = null;
  private static currentProvider: AIProvider = AIProvider.HUGGINGFACE;
  private static currentMode: 'normal' | 'judging' | 'clarifai' = 'normal';

  static getClient(): InferenceClient {
    if (!this.client) {
      this.client = new InferenceClient(this.HUGGINGFACE_API_KEY);
    }
    return this.client;
  }

  static getGitHubClient(): OpenAI {
    if (!this.githubClient) {
      this.githubClient = new OpenAI({
        apiKey: this.GITHUB_MODELS_TOKEN,
        baseURL: 'https://models.github.ai/inference',
        dangerouslyAllowBrowser: true
      });
    }
    return this.githubClient;
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

  static getClarifaiModel(): Model {
    if (!this.clarifaiModel) {
      this.clarifaiModel = new Model({
        url: "https://clarifai.com/openai/chat-completion/models/gpt-5",
        authConfig: { pat: this.CLARIFAI_PAT }
      });
    }
    return this.clarifaiModel;
  }

  static setMode(mode: 'normal' | 'judging' | 'clarifai') {
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

        case 'clarifai':
          // Clarifai mode - use Clarifai GPT-5 model
          try {
            const result = await this.sendMessageWithClarifai(messages, onChunk, abortController, options);
            console.log('✅ Clarifai request successful');
            this.currentProvider = AIProvider.CLARIFAI;
            return result;
          } catch (clarifaiError: any) {
            console.error('❌ Clarifai failed:', clarifaiError);
            
            if (clarifaiError instanceof Error && clarifaiError.message === 'Request aborted by user') {
              return "Response stopped by user.";
            }
            
            const errorMessage = "⚠️ Clarifai AI service is currently unavailable. Please try again in a moment.";
            if (onChunk) {
              onChunk(errorMessage);
            }
            return errorMessage;
          }

        case 'normal':
        default:
          // Normal mode with fallback: OpenRouter -> HuggingFace
          console.log('🟡 Trying OpenRouter first...');
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
            
            // Fallback to HuggingFace
            console.log('🔄 OpenRouter failed, trying HuggingFace...');
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
              
              console.log('✅ HuggingFace fallback successful');
              this.currentProvider = AIProvider.HUGGINGFACE;
              return out;
            } catch (hfError: any) {
              console.error('❌ HuggingFace fallback failed:', hfError);
              
              if (hfError instanceof Error && hfError.message === 'Request aborted by user') {
                return "Response stopped by user.";
              }
              
              let errorMessage = "⚠️ All AI services are currently unavailable:\n";
              
              // Provide specific error details
              if (hfError?.message?.includes('expired')) {
                errorMessage += "• HuggingFace: Authentication token expired\n";
              } else {
                errorMessage += "• HuggingFace: Service unavailable\n";
              }
              
              errorMessage += "• OpenRouter: Connection failed\n\nPlease try again in a few minutes.";
              
              if (onChunk) {
                onChunk(errorMessage);
              }
              return errorMessage;
            }
          }
      }
    } finally {
      // Clear the abort controller
      this.currentAbortController = null;
    }
  }

  private static async sendMessageWithGitHubModels(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    const client = this.getGitHubClient();
    
    try {
      const stream = await client.chat.completions.create({
        model: 'openai/gpt-5-chat',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        stream: true,
        max_tokens: 4096
      });

      let out = "";
      for await (const chunk of stream) {
        // Check if request was aborted
        if (abortController?.signal.aborted) {
          throw new Error('Request aborted by user');
        }
        
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          out += content;
          if (onChunk) {
            // Add slight delay to make streaming more visible
            await new Promise(resolve => setTimeout(resolve, 20));
            onChunk(content);
          }
        }
      }
      
      return out;
    } catch (error: any) {
      if (error.message === 'Request aborted by user') {
        throw error;
      }
      
      const errorMessage = `GitHub Models API error: ${error.message || 'Unknown error'}`;
      const apiError = new Error(errorMessage);
      (apiError as any).status = error.status || 500;
      throw apiError;
    }
  }

  private static async sendMessageWithOpenRouter(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    const client = this.getOpenRouterClient();
    
    try {
      const stream = await client.chat.completions.create({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: messages as any,
        temperature: options?.temperature || 0.7,
        stream: true,
        max_tokens: 4096
      });

      let out = "";
      for await (const chunk of stream) {
        // Check if request was aborted
        if (abortController?.signal.aborted) {
          throw new Error('Request aborted by user');
        }
        
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          out += content;
          if (onChunk) {
            // Add slight delay to make streaming more visible
            await new Promise(resolve => setTimeout(resolve, 20));
            onChunk(content);
          }
        }
      }
      
      return out;
    } catch (error: any) {
      if (error.message === 'Request aborted by user') {
        throw error;
      }
      
      const errorMessage = `OpenRouter API error: ${error.message || 'Unknown error'}`;
      const apiError = new Error(errorMessage);
      (apiError as any).status = error.status || 500;
      throw apiError;
    }
  }

  private static async sendMessageWithClarifai(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    abortController?: AbortController,
    options?: AIOptions
  ): Promise<string> {
    try {
      const model = this.getClarifaiModel();
      
      // Build prompt from conversation
      const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      
      // Create multimodal input (text only for now, can be extended for images)
      const multiInputs = Input.getMultimodalInput({
        inputId: "",
        rawText: prompt,
      });

      const inferenceParams = { 
        temperature: options?.temperature || 0.7, 
        maxTokens: 4096 
      };

      const modelPrediction = await model.predict({
        inputs: [multiInputs],
        inferenceParams,
      });

      const response = modelPrediction?.[0]?.data?.text?.raw || '';
      
      if (!response) {
        throw new Error('No response from Clarifai model');
      }

      // Stream-like UX
      if (onChunk && response) {
        const parts = response.split(/(\s+)/); // keep spaces
        for (let i = 0; i < parts.length; i++) {
          if (abortController?.signal.aborted) {
            throw new Error('Request aborted by user');
          }
          const piece = parts[i];
          if (piece) onChunk(piece);
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      return response;
    } catch (err: any) {
      console.error('🔴 Clarifai: Detailed error:', err);
      if (err?.message === 'Request aborted by user') throw err;
      
      const details = err?.message || err?.toString() || 'Unknown error';
      const apiError = new Error(`Clarifai AI API error: ${details}`);
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