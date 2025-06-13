'use client'

import { useState, useEffect, useRef, SVGProps } from 'react';

// --- Type Definitions ---
interface CardData {
  id: string;
  eyeType: 'default' | 'xx';
  poweredBy: string;
  activeIconSrc: string; // New: path to the icon shown on click
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
    containerRef: React.RefObject<HTMLDivElement>;
    mousePosition: { x: number; y: number };
}

// --- SVG Eye Components ---
const DefaultEyes = ({ containerRef, mousePosition, ...props }: EyeProps) => {
  const eye1Ref = useRef<SVGCircleElement>(null);
  const eye2Ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!containerRef.current || !eye1Ref.current || !eye2Ref.current) return;
    const { x: mouseX, y: mouseY } = mousePosition;
    const eyeRadius = 8;
    const pupilRadius = 3;
    const maxPupilOffset = eyeRadius - pupilRadius;
    [eye1Ref, eye2Ref].forEach(ref => {
        const eye = ref.current;
        if (!eye) return;
        const { left, top, width, height } = eye.getBoundingClientRect();
        const eyeCenterX = left + width / 2;
        const eyeCenterY = top + height / 2;
        const deltaX = mouseX - eyeCenterX;
        const deltaY = mouseY - eyeCenterY;
        const angle = Math.atan2(deltaY, deltaX);
        const pupilOffset = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxPupilOffset);
        const pupilX = Math.cos(angle) * pupilOffset;
        const pupilY = Math.sin(angle) * pupilOffset;
        eye.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
    });
  }, [mousePosition, containerRef]);

  return (
    <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="24" cy="32" r="8" fill="white" />
        <circle cx="40" cy="32" r="8" fill="white" />
        <circle ref={eye1Ref} cx="24" cy="32" r="3" fill="black" />
        <circle ref={eye2Ref} cx="40" cy="32" r="3" fill="black" />
    </svg>
  );
};

const XEyes = (props: SVGProps<SVGSVGElement>) => (
  <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M18 20 L30 32 M30 20 L18 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <path d="M34 20 L46 32 M46 20 L34 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

// --- Icon Container with Animation ---
const IconContainer = ({ eyeType, mousePosition, isHovered, isAnotherCardHovered, isClicked, activeIconSrc }: IconContainerProps) => {
    const iconRef = useRef<HTMLDivElement>(null);
    const [containerTransform, setContainerTransform] = useState({});
    const [iconTransform, setIconTransform] = useState({});

    useEffect(() => {
        if (!iconRef.current) return;

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
        setContainerTransform({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: 'transform 0.1s ease-out'
        });
        
        const maxOffset = isHovered ? 8 : 4;
        const translateX = (deltaX / (width / 2)) * maxOffset;
        const translateY = (deltaY / (height / 2)) * maxOffset;
        setIconTransform({
            transform: `translate(${translateX}px, ${translateY}px)`,
            transition: 'transform 0.1s ease-out'
        });
    }, [mousePosition, isHovered, isAnotherCardHovered]);

    return (
        <div 
            ref={iconRef} 
            className="bg-black rounded-lg w-56 h-56 flex items-center justify-center overflow-hidden" 
            style={containerTransform}
        >
            <div style={iconTransform}>
                {isClicked ? (
                    <img src={activeIconSrc} alt="Active agent icon" className="w-32 h-32" />
                ) : eyeType === 'xx' ? (
                    <XEyes className="w-32 h-32" /> 
                ) : (
                    <DefaultEyes containerRef={iconRef} mousePosition={mousePosition} className="w-32 h-32" />
                )}
            </div>
        </div>
    )
}

// --- Card Component ---
const AICard = ({ id, eyeType, poweredBy, activeIconSrc, mousePosition, activeCardId, hoveredId, onHover, onActivate }: CardProps) => {
  const isHovered = id === hoveredId;
  const isClicked = id === activeCardId;
  const isAnotherCardHovered = hoveredId !== null && !isHovered;
  const [dots, setDots] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isClicked) {
      interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '.' : prev + '.');
      }, 500);
    } else {
      setDots('');
    }
    return () => {
      if(interval) clearInterval(interval);
    };
  }, [isClicked]);

  const handleButtonClick = () => {
      // Toggle active state
      onActivate(isClicked ? null : id);
  }

  return (
    <div
      className="bg-white p-4 border-2 border-black rounded-lg shadow-[8px_8px_0px_#000000] flex flex-col items-center gap-4 w-full max-w-sm mx-auto transition-transform duration-300"
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      style={{ transform: `scale(${isHovered ? 1.05 : 1})`, transition: 'transform 0.2s ease' }}
    >
        <IconContainer 
            eyeType={eyeType} 
            mousePosition={mousePosition} 
            isHovered={isHovered}
            isAnotherCardHovered={isAnotherCardHovered}
            isClicked={isClicked}
            activeIconSrc={activeIconSrc}
        />
      <p className="text-center text-lg font-semibold text-gray-700">
        Powered By <span className="font-bold text-black">{poweredBy}</span>
      </p>
      <button 
        onClick={handleButtonClick}
        className="group w-full text-black bg-white border-2 border-black rounded-md py-3 px-6 text-lg font-bold hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[4px_4px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] active:shadow-none transform hover:-translate-y-px active:translate-y-0 overflow-hidden"
      >
        <span className="inline-block transition-transform duration-200 ease-in-out group-hover:scale-105">
            {isClicked ? `Starting voice agent${dots}` : 'CLICK ME'}
        </span>
      </button>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const cardData: CardData[] = [
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI', activeIconSrc: '/chat.svg' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'GEMINI', activeIconSrc: '/hume.svg' },
    { id: 'ultravox', eyeType: 'default', poweredBy: 'ULTRAVOX', activeIconSrc: '/gemini.svg' },
  ];

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="text-center max-w-4xl mx-auto mb-16">
        <h1 className="text-5xl md:text-7xl font-bold text-black mb-4">
          Voice AI Constellation
        </h1>
        <p className="text-lg md:text-xl text-gray-600">
          Hunt for voice AI treasures across the digital cosmos! Uncover powerful tools, test amazing technologies, and collect your favorite (speech to speech) voice-powered solutions in this stellar treasure trove.
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-20 md:gap-8">
        {cardData.map((card) => (
          <AICard
            key={card.id}
            {...card}
            mousePosition={mousePosition}
            hoveredId={hoveredCardId}
            activeCardId={activeCardId}
            onHover={setHoveredCardId}
            onActivate={setActiveCardId}
          />
        ))}
      </div>
    </div>
  );
}
