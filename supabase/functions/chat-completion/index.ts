import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { InferenceClient } from "https://esm.sh/@huggingface/inference@4.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider = 'huggingface' } = await req.json();
    console.log('Chat completion request:', { provider, messagesCount: messages?.length });
    
    if (provider === 'huggingface') {
      const hfToken = Deno.env.get('HF_TOKEN');
      if (!hfToken) {
        throw new Error('HuggingFace token not configured');
      }

      const client = new InferenceClient(hfToken);

      const stream = client.chatCompletionStream({
        provider: "fireworks-ai",
        model: "openai/gpt-oss-120b",
        messages: messages,
      });

      // Create a readable stream for the response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.choices && chunk.choices.length > 0) {
                const newContent = chunk.choices[0].delta.content;
                if (newContent) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: newContent })}\n\n`));
                }
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error('HuggingFace streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Fallback for other providers
    return new Response(JSON.stringify({ error: 'Provider not supported in this endpoint' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-completion function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});