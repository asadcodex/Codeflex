// pages/index.tsx
'use client';

import React, { useState, useEffect, useRef, SVGProps } from 'react';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// --- Hooks and Interfaces ---

const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    checkScreenSize();
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
  isOtherActive: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
}

interface IconContainerProps {
  eyeType: 'default' | 'xx';
  mousePosition: { x: number; y: number };
  isHovered: boolean;
  isAnotherCardHovered: boolean;
  // 'isClicked' prop was removed as it was unused.
}

interface EyeProps extends SVGProps<SVGSVGElement> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mousePosition: { x: number; y: number };
}

// --- Visual Components ---

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
            if (pupil) pupil.style.transform = `translateY(${pupilY}px)`;
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
    <path d="M11 23 L29 41 M29 23 L11 41" stroke="white" strokeWidth="4" strokeLinecap="round" />
    <path d="M35 23 L53 41 M53 23 L35 41" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const IconContainer = ({ eyeType, mousePosition, isHovered, isAnotherCardHovered }: IconContainerProps) => {
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

    if (isMobile) {
      document.addEventListener('scroll', animate, { passive: true });
      animate();
      return () => document.removeEventListener('scroll', animate);
    } else {
      animate();
    }
  }, [mousePosition, isHovered, isAnotherCardHovered, isMobile]);

  return (
    <div ref={iconRef} className="bg-black rounded-3xl w-full aspect-square flex items-center justify-center overflow-hidden transition-transform duration-100" style={containerTransform}>
      <div className="transition-transform duration-100" style={iconTransform}>
        {eyeType === 'xx' ? <XEyes className="w-36 h-36 sm:w-40 sm:h-40" /> : <DefaultEyes containerRef={iconRef} mousePosition={mousePosition} className="w-36 h-36 sm:w-40 sm:h-40" />}
      </div>
    </div>
  )
}

// --- Main Card Component with Voice Logic ---

const AICard = ({ id, poweredBy, onActivate, isActive, ...props }: CardProps) => {
  const isMobile = useIsMobile();
  const [connectionState, setConnectionState] = useState('idle');
  const [dots, setDots] = useState('');
  
  const genAiRef = useRef<GoogleGenerativeAI | null>(null);
  const chatRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key is not set. Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env.local file.");
      return;
    }
    genAiRef.current = new GoogleGenerativeAI(apiKey);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
    } else {
      console.error("Speech Recognition not supported in this browser.");
    }
  }, []);

  const cleanupVoice = () => {
    console.log('🛑 Cleaning up voice...');
    isActiveRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      } catch (e) {
        console.log('Recognition cleanup error:', e);
      }
    }
    
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.log('Speech synthesis cleanup error:', e);
    }
    
    setConnectionState('idle');
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!isActiveRef.current) {
        resolve();
        return;
      }

      console.log('🔊 Speaking:', text);
      
      window.speechSynthesis.cancel();
      
      setTimeout(() => {
        if (!isActiveRef.current) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
          console.log('✅ Speech completed');
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Speech error:', event.error);
          resolve();
        };
        
        window.speechSynthesis.speak(utterance);
      }, 100);
    });
  };

  const listen = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isActiveRef.current || !recognitionRef.current) {
        reject(new Error('Not active or recognition not available'));
        return;
      }

      console.log('🎤 Starting to listen...');
      setConnectionState('listening');

      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;

      let hasResolved = false;

      recognitionRef.current.onresult = (event: any) => {
        if (hasResolved || !isActiveRef.current) return;
        hasResolved = true;

        const transcript = event.results[0][0].transcript.trim();
        console.log('👂 Heard:', transcript);
        
        if (transcript) {
          resolve(transcript);
        } else {
          reject(new Error('Empty transcript'));
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (hasResolved || !isActiveRef.current) return;
        hasResolved = true;

        console.error('❌ Recognition error:', event.error);
        reject(new Error(`Recognition error: ${event.error}`));
      };

      recognitionRef.current.onend = () => {
        console.log('🔇 Recognition ended');
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('Recognition ended without result'));
        }
      };

      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('❌ Error starting recognition:', error);
        reject(error);
      }
    });
  };

  const getAIResponse = async (userMessage: string): Promise<string> => {
    if (!chatRef.current) {
      throw new Error('Chat not initialized');
    }

    console.log('🤖 Getting AI response for:', userMessage);
    setConnectionState('thinking');

    const result = await chatRef.current.sendMessage(userMessage);
    const responseText = result.response.text();
    console.log('💭 AI response:', responseText);
    
    return responseText;
  };

  const conversationLoop = async () => {
    while (isActiveRef.current) {
      try {
        const userMessage = await listen();
        
        if (!isActiveRef.current) break;

        const aiResponse = await getAIResponse(userMessage);
        
        if (!isActiveRef.current) break;

        await speak(aiResponse);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('❌ Conversation loop error:', error);
        
        if (!isActiveRef.current) break;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('no-speech') || errorMessage.includes('Empty transcript')) {
          await speak("I didn't hear anything. Please try speaking again.");
        } else if (errorMessage.includes('audio-capture')) {
          await speak("I'm having trouble with the microphone. Please check your microphone settings.");
        } else if (errorMessage.includes('network')) {
          await speak("I'm having network issues. Let me try again.");
        } else {
          await speak("Sorry, I encountered an error. Let's try again.");
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const startConversation = async () => {
    if (!genAiRef.current || !recognitionRef.current) {
      console.error('❌ API or Speech Recognition not initialized.');
      onActivate(null);
      return;
    }
    
    console.log('🚀 Starting conversation...');
    setConnectionState('connecting');
    isActiveRef.current = true;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
    } catch (err) {
      console.error("❌ Microphone permission denied:", err);
      alert("Microphone access is required. Please allow it and try again.");
      cleanupVoice();
      onActivate(null);
      return;
    }

    const model = genAiRef.current.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    });
    chatRef.current = model.startChat({ history: [] });
    
    setConnectionState('connected');
    
    await speak("Hi! I'm the Gemini voice agent. What would you like to talk about?");
    
    if (isActiveRef.current) {
      conversationLoop();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (connectionState === 'connecting') {
      interval = setInterval(() => setDots(prev => (prev.length >= 3 ? '.' : prev + '.')), 400);
    } else {
      setDots('');
    }
    return () => { if (interval) clearInterval(interval); };
  }, [connectionState]);

  const handleButtonClick = () => {
    onActivate(isActive ? null : id);
  };
  
  useEffect(() => {
    if (id === 'gemini') {
      if (isActive) {
        startConversation();
      } else {
        cleanupVoice();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, id]);

  useEffect(() => {
    return () => {
      cleanupVoice();
    };
    // The unused eslint-disable directive has been removed from here.
  }, []);

  const getButtonText = () => {
    if (!isActive) return 'CLICK ME';
    switch (connectionState) {
      case 'connecting': return `Starting...${dots}`;
      case 'connected': return 'Click to stop (Ready)';
      case 'listening': return 'Click to stop (Listening...)';
      case 'thinking': return 'Click to stop (Thinking...)';
      default: return 'Click to stop';
    }
  };

  const buttonTextColor = connectionState === 'idle' ? 'text-black' : 'text-gray-600';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto" onMouseEnter={() => !isMobile && props.onHover(id)} onMouseLeave={() => !isMobile && props.onHover(null)}>
      <div className="bg-white p-4 border-2 p-[60px] border-black shadow-[8px_8px_0px_#000000] flex flex-col justify-between gap-4 w-full">
        <IconContainer {...props} isHovered={id === props.hoveredId} isAnotherCardHovered={props.hoveredId !== null && id !== props.hoveredId} />
        <div className='text-center'>
          <p className="text-lg font-semibold text-gray-700">Powered By</p>
          <p className="font-bold text-black text-xl">{poweredBy}</p>
        </div>
      </div>
      <button onClick={handleButtonClick} className="w-full bg-white border-2 border-black py-3 px-6 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[8px_8px_0px_#000000]">
        <span className={`inline-block ${buttonTextColor}`}>{getButtonText()}</span>
      </button>
    </div>
  );
};

// --- App Component ---

const App = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const cardData: CardData[] = [
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'GEMINI' },
    { id: 'ultravox', eyeType: 'default', poweredBy: 'ULTRAVOX' },
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
            isOtherActive={activeCardId !== null && activeCardId !== card.id}
            onHover={setHoveredCardId}
            onActivate={setActiveCardId}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProvidedApp() {
  return <App />;
}