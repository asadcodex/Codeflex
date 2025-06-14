'use client';

import React, { useState, useEffect, useRef, SVGProps, ReactNode } from 'react';

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

// --- Type Definitions ---
interface CardData {
  id: string;
  eyeType: 'default' | 'xx';
  poweredBy: string;
  activeIconSrc: string;
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
    isClicked: boolean;
    activeIconSrc: string;
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
    <path d="M14 20 L26 32 M26 20 L14 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <path d="M38 20 L50 32 M50 20 L38 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

// --- Icon Container with Animation ---
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
                    const translateY = Math.max(-1, Math.min(1, deltaY / (viewportCenter * 0.5))) * maxOffset;
                    setIconTransform({ transform: `translateY(${translateY}px)` });
                }
                setContainerTransform({});
             } else {
                 // Updated logic to isolate hover effect
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
                const maxRotation = 1; // Only apply rotation on hover
                const rotateX = (deltaY / (height / 2)) * -maxRotation;
                const rotateY = (deltaX / (width / 2)) * maxRotation;
                setContainerTransform({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
                const maxOffset = 2; // Only apply offset on hover
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
        <div ref={iconRef} className="bg-black rounded-3xl w-full aspect-square flex items-center justify-center overflow-hidden transition-transform duration-100" style={containerTransform}>
            <div className="transition-transform duration-100" style={iconTransform}>
                {isClicked ? <img src={activeIconSrc} alt="Active agent icon" className="w-24 h-24 sm:w-28 sm:h-28" /> : eyeType === 'xx' ? <XEyes className="w-36 h-36 sm:w-40 sm:h-40" /> : <DefaultEyes containerRef={iconRef} mousePosition={mousePosition} className="w-36 h-36 sm:w-40 sm:h-40" />}
            </div>
        </div>
    )
}

// --- Card Component ---
const AICard = ({ id, poweredBy, onActivate, isActive, ...props }: CardProps) => {
  const isMobile = useIsMobile();
  const [connectionState, setConnectionState] = useState('idle'); // idle, connecting, connected
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isActive) {
      setConnectionState('connecting');
      const timer = setTimeout(() => {
        setConnectionState('connected');
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setConnectionState('idle');
    }
  }, [isActive]);

  useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      if (connectionState === 'connecting') {
          interval = setInterval(() => {
              setDots(prev => prev.length >= 3 ? '.' : prev + '.');
          }, 400);
      } else {
          setDots('');
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [connectionState]);

  const getButtonText = () => {
      switch (connectionState) {
          case 'connecting':
              return `Starting voice agent${dots}`;
          case 'connected':
              return 'Click to stop';
          default:
              return 'CLICK ME';
      }
  };
  
  const buttonTextColor = connectionState === 'idle' ? 'text-black' : 'text-gray-600';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto" onMouseEnter={() => !isMobile && props.onHover(id)} onMouseLeave={() => !isMobile && props.onHover(null)}>
        <div className="bg-white p-4 border-2 p-[60px] border-black rounded-lg shadow-[8px_8px_0px_#000000] flex flex-col justify-between gap-4 w-full h-[380px] sm:h-[420px]">
            <IconContainer {...props} isClicked={isActive} isHovered={id === props.hoveredId} isAnotherCardHovered={props.hoveredId !== null && id !== props.hoveredId}/>
            <div className='text-center'>
                <p className="text-lg font-semibold text-gray-700">Powered By</p>
                <p className="font-bold text-black text-xl">{poweredBy}</p>
            </div>
        </div>
        <button onClick={() => onActivate(isActive ? null : id)} className="w-full bg-white border-2 border-black py-3 px-6 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[8px_8px_0px_#000000]">
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
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI', activeIconSrc: '/chat.svg' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'HUMEAI', activeIconSrc: '/hume.svg' },
    { id: 'ultravox', eyeType: 'default', poweredBy: 'GEMINI', activeIconSrc: '/gemini.svg' },
  ];
  
  useEffect(() => {
    if(isMobile || activeCardId) return;
    const handleMouseMove = (event: MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile, activeCardId]);

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

// The final export remains the same
export default function ProvidedApp() {
    return <App />;
}
