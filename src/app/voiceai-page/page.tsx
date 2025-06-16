'use client';

import React, { useState, useEffect, useRef, SVGProps } from 'react';
import { OpenAI } from 'openai';

// --- IMPORTANT: API KEY CONFIGURATION ---
// For this client-side demo to work, you must add your OpenAI API key below.
// NOTE: This is for testing purposes only. Do NOT commit this key to a public repository.
const OPENAI_API_KEY = "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";

// --- Custom Hook for Voice Agent Logic ---
const useVoiceAgent = ({ provider, onStateChange, setErrorMessage }: { provider: string; onStateChange: (status: string) => void; setErrorMessage: (message: string) => void; }) => {
    const [status, setStatus] = useState('idle');
    const openaiRef = useRef<OpenAI | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioQueueRef = useRef<Blob[]>([]);
    const isPlayingRef = useRef(false);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioPlayerRef.current = new Audio();
    }, []);

    const processAudioQueue = () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioPlayerRef.current) {
            return;
        }
        isPlayingRef.current = true;
        setStatus('speaking');
        onStateChange('speaking');

        const audioBlob = audioQueueRef.current.shift();
        if (audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.play();
            audioPlayerRef.current.onended = () => {
                isPlayingRef.current = false;
                processAudioQueue();
            };
        } else {
            isPlayingRef.current = false;
        }
    };

    const connect = async () => {
        if (!OPENAI_API_KEY) {
            setErrorMessage("API Key is missing.");
            onStateChange('error');
            return;
        }

        setStatus('connecting');
        onStateChange('connecting');

        try {
            // Initialize OpenAI client on connect
            openaiRef.current = new OpenAI({
                apiKey: OPENAI_API_KEY,
                dangerouslyAllowBrowser: true, // Required for client-side usage
            });

            // Get microphone permissions
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Send welcome message
            const welcomeMessage = `Hello! I'm a voice agent powered by ${provider}. How can I help you?`;
            const speechResponse = await openaiRef.current.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: welcomeMessage,
                response_format: "mp3",
            });
            const audioBlob = await speechResponse.blob();
            audioQueueRef.current.push(audioBlob);
            processAudioQueue();
            
            setStatus('listening');
            onStateChange('listening');
            
            // Setup MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current.start(500);

            mediaRecorderRef.current.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    await handleUserAudio(event.data);
                }
            };
        } catch (error) {
            console.error("Connection or Welcome Message failed:", error);
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred.");
            onStateChange('error');
        }
    };

    const handleUserAudio = async (audioBlob: Blob) => {
        if (!openaiRef.current) return;
        try {
            const file = new File([audioBlob], "input.webm", { type: "audio/webm" });
            const transcription = await openaiRef.current.audio.transcriptions.create({
                file,
                model: "whisper-1",
            });
            
            if (!transcription.text?.trim()) return;

            const chatCompletion = await openaiRef.current.chat.completions.create({
                messages: [{ role: "user", content: transcription.text }],
                model: "gpt-4",
            });

            const gptResponse = chatCompletion.choices[0].message.content;
            if (gptResponse) {
                const speechResponse = await openaiRef.current.audio.speech.create({
                    model: "tts-1",
                    voice: "nova",
                    input: gptResponse,
                });
                const responseBlob = await speechResponse.blob();
                audioQueueRef.current.push(responseBlob);
                processAudioQueue();
            }
        } catch (error) {
            console.error("Error processing user audio:", error);
        }
    };
    
    const disconnect = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        audioQueueRef.current = [];
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
        }
        setStatus('idle');
        onStateChange('idle');
    };

    useEffect(() => {
        if (audioQueueRef.current.length === 0 && !isPlayingRef.current && status === 'speaking') {
             setStatus('listening');
             onStateChange('listening');
        }
    }, [status, onStateChange]);

    return { status, connect, disconnect };
};


// --- UI Components (No changes needed below this line) ---

const useIsMobile = (breakpoint = 768): boolean => {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkScreenSize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [breakpoint]);

    return isMobile;
};

interface CardData {
  id: string;
  eyeType: 'default' | 'xx';
  poweredBy: string;
}

interface CardProps extends CardData {
  mousePosition: { x: number; y: number };
  isActive: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
}

interface IconContainerProps {
    eyeType: 'default' | 'xx';
    mousePosition: { x: number; y: number };
    isHovered: boolean;
}

interface EyeProps extends SVGProps<SVGSVGElement> {
    containerRef: React.RefObject<HTMLDivElement | null>;
    mousePosition: { x: number; y: number };
}

const DefaultEyes = ({ containerRef, mousePosition, ...props }: EyeProps) => {
  const pupil1Ref = useRef<SVGCircleElement>(null);
  const pupil2Ref = useRef<SVGCircleElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const animate = () => {
        const pupils = [pupil1Ref.current, pupil2Ref.current];
        if (!containerRef.current || pupils.some(p => !p)) return;
        
        const maxPupilOffset = 2.5;

        if (isMobile) {
            const { top, bottom, height } = containerRef.current.getBoundingClientRect();
            if (top >= 0 && bottom <= window.innerHeight) {
                const viewportCenter = window.innerHeight / 2;
                const elementCenter = top + height / 2;
                const deltaY = viewportCenter - elementCenter;
                const pupilY = Math.max(-1, Math.min(1, deltaY / (viewportCenter * 0.5))) * maxPupilOffset;
                pupils.forEach(pupil => {
                    if(pupil) pupil.style.transform = `translateY(${pupilY}px)`;
                });
            }
        } else {
            const { x: mouseX, y: mouseY } = mousePosition;
            pupils.forEach(pupil => {
                if (!pupil) return;
                const { left, top, width, height } = pupil.getBoundingClientRect();
                const eyeCenterX = left + width / 2;
                const eyeCenterY = top + height / 2;
                const deltaX = mouseX - eyeCenterX;
                const deltaY = mouseY - eyeCenterY;
                const angle = Math.atan2(deltaY, deltaX);
                const pupilOffset = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxPupilOffset);
                const pupilX = Math.cos(angle) * pupilOffset;
                const pupilY = Math.sin(angle) * pupilOffset;
                pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
            });
        }
    };
    
    if (isMobile) {
        document.addEventListener('scroll', animate, { passive: true });
        animate();
        return () => document.removeEventListener('scroll', animate);
    } else {
        animate();
    }

  }, [mousePosition, containerRef, isMobile]);

  return (
    <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g><circle cx="20" cy="32" r="10" fill="white" /><circle ref={pupil1Ref} cx="20" cy="32" r="9" fill="black" /></g>
        <g><circle cx="44" cy="32" r="10" fill="white" /><circle ref={pupil2Ref} cx="44" cy="32" r="9" fill="black" /></g>
    </svg>
  );
};

const XEyes = (props: SVGProps<SVGSVGElement>) => (
  <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M11 23 L29 41 M29 23 L11 41" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <path d="M35 23 L53 41 M53 23 L35 41" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const IconContainer = ({ eyeType, mousePosition, isHovered }: IconContainerProps) => {
    const iconRef = useRef<HTMLDivElement>(null);
    const [containerTransform, setContainerTransform] = useState({});
    const [iconTransform, setIconTransform] = useState({});
    const isMobile = useIsMobile();

    useEffect(() => {
        const animate = () => {
             if (!iconRef.current) return;

             if (isMobile) {
                const { top, bottom, height } = iconRef.current.getBoundingClientRect();
                if (top >= 0 && bottom <= window.innerHeight) {
                    const viewportCenter = window.innerHeight / 2;
                    const elementCenter = top + height / 2;
                    const deltaY = viewportCenter - elementCenter;
                    const maxOffset = 8;
                    const translateY = Math.max(-1, Math.min(1, deltaY / (viewportCenter * 0.5))) * maxOffset;
                    setIconTransform({ transform: `translateY(${translateY}px)` });
                }
                setContainerTransform({});
             } else {
                if (!isHovered) {
                    setContainerTransform({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' });
                    setIconTransform({ transform: 'translate(0px, 0px)' });
                    return;
                }
                const { x: mouseX, y: mouseY } = mousePosition;
                const { left, top, width, height } = iconRef.current.getBoundingClientRect();
                const centerX = left + width / 2;
                const centerY = top + height / 2;
                const deltaX = mouseX - centerX;
                const deltaY = mouseY - centerY;
                const maxRotation = 1;
                const rotateX = (deltaY / (height / 2)) * -maxRotation;
                const rotateY = (deltaX / (width / 2)) * maxRotation;
                setContainerTransform({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
                const maxOffset = 2;
                const translateX = (deltaX / (width / 2)) * maxOffset;
                const translateY = (deltaY / (height / 2)) * maxOffset;
                setIconTransform({ transform: `translate(${translateX}px, ${translateY}px)`});
            }
        };

        if(isMobile) {
            document.addEventListener('scroll', animate, { passive: true });
            animate();
            return () => document.removeEventListener('scroll', animate);
        } else {
            animate();
        }
    }, [mousePosition, isHovered, isMobile]);

    return (
        <div ref={iconRef} className="bg-black rounded-2xl w-full aspect-square flex items-center justify-center overflow-hidden transition-transform duration-100" style={containerTransform}>
            <div className="transition-transform duration-100" style={iconTransform}>
                {eyeType === 'xx' ? <XEyes className="w-36 h-36 sm:w-40 sm:h-40" /> : <DefaultEyes containerRef={iconRef} mousePosition={mousePosition} className="w-36 h-36 sm:w-40 sm:h-40" />}
            </div>
        </div>
    )
}

const AICard = ({ id, eyeType, poweredBy, onActivate, isActive, mousePosition, hoveredId, onHover }: CardProps) => {
  const isMobile = useIsMobile();
  const [agentStatus, setAgentStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const { connect, disconnect } = useVoiceAgent({ provider: poweredBy, onStateChange: setAgentStatus, setErrorMessage });
  const [dots, setDots] = useState('');

  const handleToggleConnection = () => {
      if (isActive) {
          disconnect();
          onActivate(null);
      } else {
          setErrorMessage(""); 
          connect();
          onActivate(id);
      }
  };

  useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      if (agentStatus === 'connecting') {
          interval = setInterval(() => {
              setDots(prev => prev.length >= 3 ? '.' : prev + '.');
          }, 400);
      } else {
          setDots('');
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [agentStatus]);

  const getButtonText = () => {
      if (!isActive) return 'CLICK ME';
      switch (agentStatus) {
          case 'connecting': return `Starting voice agent${dots}`;
          case 'speaking': return 'Speaking...';
          case 'listening': return 'Listening...';
          case 'error': return `Error: ${errorMessage || 'Failed'}`;
          default: return 'Click to stop';
      }
  };
  
  const buttonTextColor = !isActive ? 'text-black' : 'text-gray-600';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto" onMouseEnter={() => !isMobile && onHover(id)} onMouseLeave={() => !isMobile && onHover(null)}>
        <div className="bg-white p-4 border-2 border-black rounded-lg shadow-[8px_8px_0px_#000000] flex flex-col gap-4 w-full">
            <IconContainer 
                eyeType={eyeType} 
                mousePosition={mousePosition} 
                isHovered={id === hoveredId} 
            />
            <div className='text-center mt-auto'>
                <p className="text-lg font-semibold text-gray-700">Powered By</p>
                <p className="font-bold text-black text-xl">{poweredBy}</p>
            </div>
        </div>
        <button onClick={handleToggleConnection} className="w-full bg-white border-2 border-black py-3 px-6 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[8px_8px_0px_#000000]">
            <span className={`inline-block ${buttonTextColor}`}>{getButtonText()}</span>
        </button>
    </div>
  );
};

const App = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const cardData: CardData[] = [
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'HUMEAI' },
    { id: 'ultravox', eyeType: 'default', poweredBy: 'GEMINI' },
  ];
  
  useEffect(() => {
    if (isMobile) return; 
    const handleMouseMove = (event: MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  return (
    <div className="bg-gray-50 min-h-screen font-sans flex flex-col items-center p-4 sm:p-8 overflow-x-hidden">
        <div className="text-center max-w-4xl mx-auto mb-12 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-black mb-4">
              Voice AI Constellation
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Hunt for voice AI treasures across the digital cosmos! Uncover powerful tools, test amazing technologies, and collect your favorite (speech to speech) voice-powered solutions in this stellar treasure trove.
            </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-8">
            {cardData.map((card) => (
              <AICard 
                key={card.id} 
                {...card} 
                mousePosition={mousePosition} 
                hoveredId={hoveredCardId}
                isActive={activeCardId === card.id}
                onHover={setHoveredCardId} 
                onActivate={setActiveCardId}
              />
            ))}
        </div>
    </div>
  );
}

export default App;
