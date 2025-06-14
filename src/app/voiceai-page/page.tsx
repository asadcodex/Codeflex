'use client';

import { useState, useEffect, useRef, SVGProps, createContext, useContext, ReactNode } from 'react';

interface IHumeContext {
    status: string;
    connect: () => Promise<void>;
    disconnect: () => void;
}

// --- MOCK HUME AI SDK ---
const MockHumeVoiceContext = createContext<IHumeContext | null>(null);

const MockHumeVoiceProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState('disconnected');
    
    const connect = () => {
        setStatus('connecting');
        setTimeout(() => setStatus('connected'), 2000);
        return Promise.resolve();
    };

    const disconnect = () => {
        setStatus('disconnected');
    };

    const value: IHumeContext = { status, connect, disconnect };

    return (
        <MockHumeVoiceContext.Provider value={value}>
            {children}
        </MockHumeVoiceContext.Provider>
    );
};

const useVoice = () => {
    const context = useContext(MockHumeVoiceContext);
    if (!context) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
};
// --- END MOCK SDK ---


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
  activeIconSrc: string;
  sdkType: 'hume' | 'openai';
}

interface CardProps extends CardData {
  mousePosition: { x: number; y: number };
  activeCardId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
}

interface IconContainerProps {
    eyeType: 'default' | 'xx';
    mousePosition: { x: number; y: number };
    isHovered: boolean;
    isAnotherCardHovered: boolean;
    isClicked: boolean;
    activeIconSrc: string;
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

        if (isMobile) {
            const { top, bottom, height } = containerRef.current.getBoundingClientRect();
            if (top >= 0 && bottom <= window.innerHeight) {
                const viewportCenter = window.innerHeight / 2;
                const elementCenter = top + height / 2;
                const deltaY = viewportCenter - elementCenter;
                const maxPupilOffset = 2.5;
                const pupilY = Math.max(-1, Math.min(1, deltaY / (viewportCenter * 0.5))) * -maxPupilOffset;
                pupils.forEach(pupil => {
                    if(pupil) pupil.style.transform = `translateY(${pupilY}px)`;
                });
            }
        } else {
            const { x: mouseX, y: mouseY } = mousePosition;
            const maxPupilOffset = 2.5;
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
        <g><circle cx="22" cy="32" r="8" fill="white" /><circle ref={pupil1Ref} cx="22" cy="32" r="7" fill="black" /></g>
        <g><circle cx="42" cy="32" r="8" fill="white" /><circle ref={pupil2Ref} cx="42" cy="32" r="7" fill="black" /></g>
    </svg>
  );
};

const XEyes = (props: SVGProps<SVGSVGElement>) => (
  <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M16 20 L28 32 M28 20 L16 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <path d="M36 20 L48 32 M48 20 L36 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const IconContainer = ({ eyeType, mousePosition, isHovered, isAnotherCardHovered, isClicked, activeIconSrc }: IconContainerProps) => {
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
                    const translateY = Math.max(-1, Math.min(1, deltaY / (viewportCenter * 0.5))) * -maxOffset;
                    setIconTransform({ transform: `translateY(${translateY}px)` });
                }
                setContainerTransform({});
             } else {
                if (isAnotherCardHovered) {
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
                const maxRotation = isHovered ? 4 : 1;
                const rotateX = (deltaY / (height / 2)) * -maxRotation;
                const rotateY = (deltaX / (width / 2)) * maxRotation;
                setContainerTransform({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
                const maxOffset = isHovered ? 8 : 4;
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
    }, [mousePosition, isHovered, isAnotherCardHovered, isClicked, isMobile]);

    return (
        <div ref={iconRef} className="bg-black mt-[35px] rounded-lg w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center overflow-hidden transition-transform duration-100" style={containerTransform}>
            <div className="transition-transform duration-100" style={iconTransform}>
                {isClicked ? <img src={activeIconSrc} alt="Active agent icon" className="w-24 h-24 sm:w-28 sm:h-28" /> : eyeType === 'xx' ? <XEyes className="w-28 h-28 sm:w-32 sm:h-32" /> : <DefaultEyes containerRef={iconRef} mousePosition={mousePosition} className="w-28 h-28 sm:w-32 sm:h-32" />}
            </div>
        </div>
    )
}

// --- Card Component ---
const AICard = ({ id, eyeType, poweredBy, activeIconSrc, sdkType, mousePosition, activeCardId, hoveredId, onHover, onActivate }: CardProps) => {
  const isHovered = id === hoveredId;
  const isMobile = useIsMobile();
  
  return (
    <div className="bg-white p-4 border-2 border-black rounded-lg shadow-[8px_8px_0px_#000000] flex flex-col items-center gap-4 w-full max-w-sm mx-auto transition-transform duration-300" onMouseEnter={() => !isMobile && onHover(id)} onMouseLeave={() => !isMobile && onHover(null)} style={{ transform: `scale(${isHovered && !isMobile ? 1.05 : 1})`, transition: 'transform 0.2s ease' }}>
        <IconContainer eyeType={eyeType} mousePosition={mousePosition} isHovered={isHovered} isAnotherCardHovered={hoveredId !== null && !isHovered} isClicked={id === activeCardId} activeIconSrc={activeIconSrc} />
        <p className="text-center text-lg font-semibold text-gray-700">Powered By <span className="font-bold text-black">{poweredBy}</span></p>
        <button onClick={() => onActivate(id)} className="group w-full bg-white border-2 border-black rounded-md py-3 px-6 text-lg font-bold hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[4px_4px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] active:shadow-none transform hover:-translate-y-px active:translate-y-0 overflow-hidden">
            <span className="inline-block text-black transition-transform duration-200 ease-in-out group-hover:scale-105">CLICK ME</span>
        </button>
    </div>
  );
};

interface VoiceAgentUIProps {
    agent: CardData;
    onClose: () => void;
}

const VoiceAgentUI = ({ agent, onClose }: VoiceAgentUIProps) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const hume = useVoice();

    useEffect(() => {
        if (!agent) return;
        if (agent.sdkType === 'hume') {
            hume.connect();
        } else {
            setConnectionStatus('connecting');
            const timer = setTimeout(() => setConnectionStatus('connected'), 2000);
            return () => clearTimeout(timer);
        }
    }, [agent, hume]);

    const handleDisconnect = () => {
        if (agent.sdkType === 'hume') {
            hume.disconnect();
        }
        onClose();
    };
    
    const getStatusText = () => {
        if (agent.sdkType === 'hume') {
            return hume.status.charAt(0).toUpperCase() + hume.status.slice(1) + '...';
        }
        return connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1) + '...';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 border-2 border-black shadow-[8px_8px_0px_#000000] flex flex-col items-center gap-6 w-full max-w-md">
                <img src={agent.activeIconSrc} alt={`${agent.poweredBy} logo`} className="w-24 h-24" />
                <h2 className="text-2xl text-black font-bold">{agent.poweredBy} Agent</h2>
                <p className="text-lg text-gray-600 animate-pulse">{getStatusText()}</p>
                <button onClick={handleDisconnect} className="w-full bg-red-500 text-white border-2 border-black rounded-md py-3 px-6 text-lg font-bold hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[4px_4px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] active:shadow-none transform hover:-translate-y-px active:translate-y-0">
                    Disconnect
                </button>
            </div>
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
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI', activeIconSrc: '/chat.svg', sdkType: 'openai' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'HUMEAI', activeIconSrc: '/hume.svg', sdkType: 'hume' },
    { id: 'ultravox', eyeType: 'default', poweredBy: 'GEMINI', activeIconSrc: '/gemini.svg', sdkType: 'openai' },
  ];
  
  const activeAgent = cardData.find(card => card.id === activeCardId) || null;

  useEffect(() => {
    if(isMobile || activeAgent) return;
    const handleMouseMove = (event: MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile, activeAgent]);

  return (
    <div className="bg-gray-50 min-h-screen font-sans flex flex-col items-center p-4 sm:p-8 overflow-x-hidden">
        {activeAgent && <VoiceAgentUI agent={activeAgent} onClose={() => setActiveCardId(null)} />}
        
        <div className="text-center max-w-4xl mx-auto mb-12 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-black mb-4">
              Voice AI Constellation
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Hunt for voice AI treasures across the digital cosmos! Uncover powerful tools, test amazing technologies, and collect your favorite (speech to speech) voice-powered solutions in this stellar treasure trove.
            </p>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {cardData.map((card) => (
              <AICard key={card.id} {...card} mousePosition={mousePosition} hoveredId={hoveredCardId} activeCardId={activeCardId} onHover={setHoveredCardId} onActivate={setActiveCardId}/>
            ))}
        </div>
    </div>
  );
}

export default function ProvidedApp() {
    return (
        <MockHumeVoiceProvider>
            <App />
        </MockHumeVoiceProvider>
    );
}
