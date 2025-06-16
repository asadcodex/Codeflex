'use client';

import React, { useState, useEffect, useRef, SVGProps } from 'react';

// --- Custom Hook for Screen Size ---
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

// --- Custom Hook for Voice Agent Logic ---
const useVoiceAgent = ({ onStateChange, setErrorMessage }: { onStateChange: (status: string) => void; setErrorMessage: (message: string) => void; }) => {
    const [status, setStatus] = useState('idle');
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioQueueRef = useRef<Blob[]>([]);
    const isPlayingRef = useRef(false);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        try {
            setStatus('connecting');
            onStateChange('connecting');

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/api/voice`;
            
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onopen = () => {
                console.log('Frontend: WebSocket connection established.');
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(event.data);
                    }
                };
                
                mediaRecorderRef.current.start(500);

                pingIntervalRef.current = setInterval(() => {
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 10000);
            };

            socketRef.current.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    audioQueueRef.current.push(event.data);
                    processAudioQueue();
                } else {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.status === 'connected') {
                            setStatus('listening');
                            onStateChange('listening');
                            console.log('Frontend: Voice agent is ready and listening.');
                        } else if (data.error) {
                            console.error("Frontend: Received error from server:", data.error);
                            setErrorMessage(data.error);
                            setStatus('error');
                            onStateChange('error');
                            disconnect();
                        }
                    } catch {
                        // Fixed: Removed unused variable 'e'
                        console.log("Received non-JSON message:", event.data)
                    }
                }
            };
            
             socketRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                setStatus('idle');
                onStateChange('idle');
                if (mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
                if(pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            };

            socketRef.current.onerror = (error) => {
                console.error('Frontend: WebSocket error:', error);
                setErrorMessage("Connection failed.");
                setStatus('error');
                onStateChange('error');
            };

        } catch (error) {
            console.error('Failed to get microphone access:', error);
            setErrorMessage("Microphone access denied.");
            setStatus('error');
            onStateChange('error');
        }
    };
    
    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
    };

    useEffect(() => {
        if (audioQueueRef.current.length === 0 && !isPlayingRef.current && status === 'speaking') {
             setStatus('listening');
             onStateChange('listening');
        }
    }, [status, onStateChange]);


    return { status, connect, disconnect };
};


// --- Type Definitions ---
interface CardData {
  id: string;
  eyeType: 'default' | 'xx';
  poweredBy: string;
}

interface CardProps extends CardData {
  mousePosition: { x: number; y: number };
  isActive: boolean;
  isOtherActive?: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
}

interface IconContainerProps {
    eyeType: 'default' | 'xx';
    mousePosition: { x: number; y: number };
    isHovered: boolean;
    isAnotherCardHovered?: boolean;
}

interface EyeProps extends SVGProps<SVGSVGElement> {
    containerRef: React.RefObject<HTMLDivElement | null>;
    mousePosition: { x: number; y: number };
}


// --- SVG Eye Components ---
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

// --- Icon Container with Animation ---
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

// --- Card Component ---
const AICard = ({ id, eyeType, poweredBy, onActivate, isActive, mousePosition, hoveredId, onHover }: CardProps) => {
  const isMobile = useIsMobile();
  const [agentStatus, setAgentStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const { connect, disconnect } = useVoiceAgent({ onStateChange: setAgentStatus, setErrorMessage });
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
                isAnotherCardHovered={hoveredId !== null && id !== hoveredId}
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


// --- Main App Component ---
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
                isOtherActive={activeCardId !== null && activeCardId !== card.id}
                onHover={setHoveredCardId} 
                onActivate={setActiveCardId}
              />
            ))}
        </div>
    </div>
  );
}

export default App;