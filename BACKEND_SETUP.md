# Backend Setup Guide

To connect your Neural Talker frontend to the HuggingFace AI backend, follow these steps:

## 1. Set up Supabase Edge Function

1. Connect your project to Supabase (if not already done)
2. Create a new Edge Function called `chat-completion`
3. Add your provided code to the Edge Function

## 2. Edge Function Code

Create `supabase/functions/chat-completion/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { InferenceClient } from "https://esm.sh/@huggingface/inference@4.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const client = new InferenceClient(Deno.env.get('HF_TOKEN'));

    let out = "";

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
                out += newContent;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: newContent })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
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

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## 3. Add Environment Variables

1. In your Supabase dashboard, go to Project Settings > Edge Functions
2. Add a new secret: `HF_TOKEN` with your HuggingFace API token

## 4. Update Frontend

Replace the demo response in `src/lib/aiService.ts` with actual API calls to your Supabase Edge Function.

## 5. Deploy

Deploy your Edge Function using:
```bash
supabase functions deploy chat-completion
```

Your AI chat is now ready to use with real HuggingFace AI responses!