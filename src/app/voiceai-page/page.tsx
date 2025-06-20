'use client';

import React, { useState, useEffect, useRef, SVGProps } from 'react';
import { FlowProvider, useFlow, useFlowEventListener } from '@speechmatics/flow-client-react';

const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < breakpoint);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [breakpoint]);
  return isMobile;
};
interface CardData { id: string; eyeType: 'default' | 'xx'; poweredBy: string; }
interface CardProps extends CardData { mousePosition: { x: number; y: number }; isActive: boolean; isOtherActive: boolean; hoveredId: string | null; onHover: (id: string | null) => void; onActivate: (id: string | null) => void; }
interface IconContainerProps { eyeType: 'default' | 'xx'; mousePosition: { x: number; y: number }; isHovered: boolean; isAnotherCardHovered: boolean; }
interface EyeProps extends SVGProps<SVGSVGElement> { containerRef: React.RefObject<HTMLDivElement | null>; mousePosition: { x: number; y: number }; }

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
          pupils.forEach(pupil => { if (pupil) pupil.style.transform = `translateY(${pupilY}px)`; });
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
const XEyes = (props: SVGProps<SVGSVGElement>) => ( <svg width="100" height="100" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> <path d="M11 23 L29 41 M29 23 L11 41" stroke="white" strokeWidth="4" strokeLinecap="round" /> <path d="M35 23 L53 41 M53 23 L35 41" stroke="white" strokeWidth="4" strokeLinecap="round" /> </svg> );
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
};

const AICard = ({ id, poweredBy, onActivate, isActive, ...props }: CardProps) => {
  const isMobile = useIsMobile();
  type AgentState = 'idle' | 'connecting' | 'speaking' | 'listening' | 'error';
  const [agentState, setAgentState] = useState<AgentState>('idle');

  const { startConversation, endConversation, sendAudio } = useFlow();
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isActiveRef.current) return resolve();
      
      setAgentState('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        if (isActiveRef.current) startMicrophone();
        resolve();
      };
      utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        if (isActiveRef.current) setAgentState('error');
        reject(e.error);
      }
      window.speechSynthesis.speak(utterance);
    });
  };

  const startMicrophone = async () => {
    if (!isActiveRef.current || agentState === 'listening') return;
    
    setAgentState('listening');
    console.log("🎤 Starting microphone...");

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        sendAudio(int16Array.buffer);
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      audioProcessorRef.current = processor;
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Microphone access is required.");
      if (isActiveRef.current) setAgentState('error');
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    console.log("🛑 Microphone stopped.");
  };

  const audioQueue = useRef<Int16Array[]>([]).current;
  const isPlaying = useRef(false);
  
  const playNextInQueue = () => {
    if (isPlaying.current || audioQueue.length === 0) return;
    
    isPlaying.current = true;
    setAgentState('speaking');
    const audioData = audioQueue.shift();
    
    if (audioData && audioContextRef.current) {
      const float32Array = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) float32Array[i] = audioData[i] / 32768;
      
      const buffer = audioContextRef.current.createBuffer(1, float32Array.length, 16000);
      buffer.copyToChannel(float32Array, 0);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlaying.current = false;
        playNextInQueue();
      };
      source.start();
    } else {
      isPlaying.current = false;
      if (isActiveRef.current) startMicrophone();
    }
  };
  
  useFlowEventListener("agentAudio", (audio: { data: Int16Array }) => {
    if (isActiveRef.current && id === 'speechmatics') {
      stopMicrophone();
      audioQueue.push(audio.data);
      playNextInQueue();
    }
  });

  useFlowEventListener("message", (message: { data: { message: string } }) => {
    if (isActiveRef.current && id === 'speechmatics') {
      if (message.data.message === 'ConversationStarted') {
        console.log("✅ Speechmatics connection confirmed by server.");
        speak("Hey, I'm a voice agent powered by Speechmatics. What do you wanna ask me?");
      }
    }
  });

  const startSpeechmatics = async () => {
    setAgentState('connecting');
    try {
      const response = await fetch('/api/speechmatics-token', { method: 'POST' });
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || 'Failed to fetch authentication token.');
      }
      const { token } = await response.json();

      await startConversation(token, {
        config: {
          template_id: '127c853d-2965-483c-86cb-0458dbdf7d69:latest',
          template_variables: {},
        },
        audioFormat: { type: 'raw', encoding: 'pcm_s16le', sample_rate: 16000 },
      });
      
    } catch (error) {
      console.error("Error starting Speechmatics connection:", error);
      alert((error as Error).message);
      if (isActiveRef.current) setAgentState('error');
    }
  };

  const stopSpeechmatics = () => {
    stopMicrophone();
    endConversation();
    audioQueue.length = 0;
    isPlaying.current = false;
    window.speechSynthesis.cancel();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAgentState('idle');
  };

  useEffect(() => {
    if (id !== 'speechmatics') return;
    
    if (isActive) {
      startSpeechmatics();
    } else {
      stopSpeechmatics();
    }
  }, [isActive, id]);

  const getButtonText = () => {
    if (id === 'speechmatics') {
      if (!isActive) return "CLICK ME";
      switch (agentState) {
        case 'connecting': return "Starting voice agent...";
        case 'speaking': return "Click to Stop (Speaking)";
        case 'listening': return "Click to Stop (Listening)";
        case 'error': return "Error - Click to Reset";
        case 'idle': return "Click to Stop";
        default: return "Click to Stop";
      }
    }
    return 'CLICK ME';
  };
  
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto" onMouseEnter={() => !isMobile && props.onHover(id)} onMouseLeave={() => !isMobile && props.onHover(null)}>
      <div className="bg-white p-4 border-2 p-[60px] border-black shadow-[8px_8px_0px_#000000] flex flex-col justify-between gap-4 w-full">
        <IconContainer {...props} isHovered={id === props.hoveredId} isAnotherCardHovered={props.hoveredId !== null && id !== props.hoveredId} />
        <div className='text-center'>
          <p className="text-lg font-semibold text-gray-700">Powered By</p>
          <p className="font-bold text-black text-xl">{poweredBy}</p>
        </div>
      </div>
      <button onClick={() => onActivate(isActive ? null : id)} className="w-full bg-white border-2 border-black py-3 px-6 text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[8px_8px_0px_#000000]">
        <span>{getButtonText()}</span>
      </button>
    </div>
  );
};

const ProvidedApp = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const cardData: CardData[] = [
    { id: 'openai', eyeType: 'default', poweredBy: 'OPENAI' },
    { id: 'gemini', eyeType: 'xx', poweredBy: 'GEMINI' },
    { id: 'speechmatics', eyeType: 'default', poweredBy: 'SPEECHMATICS' },
  ];

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (event: MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  return (
    <FlowProvider appId="voice-ai-constellation">
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
    </FlowProvider>
  );
}

export default function VoiceAiPage() {
    return <ProvidedApp />;
}