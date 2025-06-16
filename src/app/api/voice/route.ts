// --- IMPORTANT: This code is for the Next.js App Router and MUST run in the Edge Runtime ---
// For this to work, the file MUST be named route.ts inside the /api/voice/ directory.
// If it fails locally, it's an environment issue. Deploying to Vercel is the best way to test.

export const runtime = 'edge';

import { OpenAI } from 'openai';

// This helper function is crucial for streaming data correctly in the Edge environment.
async function streamToSocket(stream: ReadableStream<Uint8Array>, socket: WebSocket) {
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break; // The stream has finished.
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(value);
            } else {
                console.log("Backend: Socket closed during stream. Aborting.");
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
        console.log(`Backend: User said -> "${transcription.text}"`);

        if (!transcription.text?.trim()) return;

        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: "user", content: transcription.text }],
            model: "gpt-4",
        });
        const gptResponse = chatCompletion.choices[0].message.content;
        console.log(`Backend: AI says -> "${gptResponse}"`);

        if (gptResponse) {
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
        console.error("Backend: Error in AI processing pipeline:", error);
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ error: "An error occurred while processing your request." }));
        }
    }
}

// This is the main API route handler for GET requests.
export async function GET(request: Request) {
    // Check for OpenAI API Key first thing.
    if (!process.env.OPENAI_API_KEY) {
        return new Response("Missing OPENAI_API_KEY environment variable.", { status: 500 });
    }
    
    // @ts-ignore: Deno is a global available in the Vercel Edge Runtime.
    if (!Deno.upgradeWebSocket) {
        return new Response("WebSocket upgrades are not supported in this environment.", { status: 501 });
    }

    // @ts-ignore: Deno is a global available in the Vercel Edge Runtime.
    const { socket, response } = Deno.upgradeWebSocket(request);

    let openai: OpenAI;
    
    socket.onopen = async () => {
        console.log("Backend: Socket connection opened.");
        try {
          openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          socket.send(JSON.stringify({ status: 'connected' }));
          
          const welcomeMessage = "Hello! I am a voice assistant powered by OpenAI. How can I help you today?";
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
                // Ensure openai client is initialized before using it.
                if (!openai) {
                    console.error("Backend: OpenAI client not initialized, cannot process audio.");
                    return;
                }
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
