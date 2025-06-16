// This file MUST be named route.ts and be located at src/app/api/voice/route.ts
// This code is for the Next.js App Router and MUST run in the Edge Runtime.
export const runtime = 'edge';

import { OpenAI } from 'openai';

// This helper function is crucial for streaming data correctly in the Edge environment.
async function streamToSocket(stream: ReadableStream<Uint8Array>, socket: WebSocket) {
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(value);
            } else {
                break;
            }
        }
    } catch (error) {
        console.error("Backend: Error reading from stream:", error);
    } finally {
        reader.releaseLock();
    }
}

// This function handles the full AI interaction pipeline.
async function handleAudioFromClient(audioBlob: Blob, socket: WebSocket, openai: OpenAI) {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: audioBlob,
            model: "whisper-1",
        });

        if (!transcription.text?.trim()) return;
        console.log(`Backend: User said -> "${transcription.text}"`);

        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: "user", content: transcription.text }],
            model: "gpt-4",
        });
        const gptResponse = chatCompletion.choices[0].message.content;
        
        if (gptResponse) {
             console.log(`Backend: AI says -> "${gptResponse}"`);
             const speechStream = await openai.audio.speech.create({
                model: "tts-1",
                voice: "nova",
                input: gptResponse,
                response_format: "mp3",
            });
            
            if (speechStream.body) {
                await streamToSocket(speechStream.body, socket);
            }
        }
    } catch(error) {
        console.error("Backend: Error in AI pipeline:", error);
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ error: "Could not process audio." }));
        }
    }
}

// This is the main API route handler for GET requests.
export async function GET(request: Request) {
    // A quick check for the API key to fail fast.
    if (!process.env.OPENAI_API_KEY) {
        return new Response("OPENAI_API_KEY environment variable not set", { status: 500 });
    }
    
    // @ts-ignore: Deno is a global available in the Vercel Edge Runtime.
    if (!Deno.upgradeWebSocket) {
        return new Response("Environment does not support WebSocket upgrades.", { status: 501 });
    }

    // @ts-ignore: Deno is a global available in the Vercel Edge Runtime.
    const { socket, response } = Deno.upgradeWebSocket(request);

    let openai: OpenAI;
    
    socket.onopen = async () => {
        console.log("Backend: Socket connection opened.");
        try {
          openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          socket.send(JSON.stringify({ status: 'connected' }));
          
          const welcomeMessage = "Hello! I am a voice assistant. How may I help you today?";
          const speechStream = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: welcomeMessage,
            response_format: "mp3",
          });
          if (speechStream.body) {
            await streamToSocket(speechStream.body, socket);
          }
        } catch (error) {
          console.error("Backend: Error during socket setup:", error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          socket.send(JSON.stringify({ error: errorMessage }));
          socket.close(1011, "Server setup failed");
        }
    };

    socket.onmessage = async (event: MessageEvent) => {
        try {
            if (event.data instanceof Blob) {
                if (!openai) throw new Error("OpenAI client not initialized.");
                await handleAudioFromClient(event.data, socket, openai);
            }
        } catch (e) {
            console.error("Backend: Error processing incoming message:", e);
        }
    };

    socket.onclose = (event: CloseEvent) => {
        console.log("Backend: Socket closed.", { code: event.code, reason: event.reason });
    };

    socket.onerror = (event: Event) => {
        console.error("Backend: An unhandled WebSocket error occurred:", event);
    };

    return response;
}
