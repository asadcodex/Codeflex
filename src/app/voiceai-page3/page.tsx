"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const aiTools = [
  { name: "OPENAI" },
  { name: "GEMINI" },
  { name: "ULTRAVOX" },
  { name: "VOXITY" },
  { name: "SENTIENCE" },
  { name: "NEURALCORE" },
];

export default function VoiceAIPage() {
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getRandom = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const triggerChaosBounce = (index: number) => {
    const el = imageRefs.current[index];
    const container = containerRefs.current[index];
    if (!el || !container) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }

    const bounces = 4;
    for (let i = 0; i < bounces; i++) {
      const x = getRandom(-150, 150);
      const y = getRandom(-100, 100);
      const rot = getRandom(-180, 180);

      tl.to(el, {
        x,
        y,
        rotate: rot,
        filter: "blur(2px)",
        boxShadow: "0px 8px 16px rgba(0,0,0,0.3)",
        duration: 0.3,
        onStart: () => {
          spawnTrail(el, container);
        },
      }).to(el, {
        x: 0,
        y: 0,
        rotate: 0,
        filter: "blur(0px)",
        boxShadow: "0px 0px 0px rgba(0,0,0,0)",
        duration: 0.3,
        ease: "bounce.out",
        onStart: () => {
          spawnSpark(container);
        },
      });
    }
  };

  const spawnTrail = (el: HTMLElement, container: HTMLElement) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.classList.add("absolute", "z-0", "opacity-40");
    clone.style.pointerEvents = "none";
    clone.style.left = el.offsetLeft + "px";
    clone.style.top = el.offsetTop + "px";
    clone.style.transform = el.style.transform;
    container.appendChild(clone);
    gsap.to(clone, {
      opacity: 0,
      scale: 1.5,
      duration: 0.5,
      onComplete: () => clone.remove(),
    });
  };

  const spawnSpark = (container: HTMLElement) => {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("div");
      spark.className =
        "absolute bg-yellow-300 rounded-full pointer-events-none z-0";
      spark.style.width = "8px";
      spark.style.height = "8px";
      spark.style.left = "50%";
      spark.style.top = "50%";
      container.appendChild(spark);

      const angle = Math.random() * Math.PI * 2;
      const distance = getRandom(30, 60);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      gsap.to(spark, {
        x,
        y,
        opacity: 0,
        scale: 1.5,
        duration: 0.6,
        ease: "power1.out",
        onComplete: () => spark.remove(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-12 text-center relative">
      <audio ref={audioRef} src="/click-sound.mp3" preload="auto" />
      <h1 className="text-4xl font-bold mb-2 text-black">
        Voice AI <span className="italic font-normal">Constellation</span>
      </h1>
      <p className="text-gray-600 max-w-2xl mx-auto mb-12">
        Hunt for voice AI treasures across the digital cosmos! Uncover powerful
        tools, test amazing technologies, and collect your favorite{" "}
        <em>(speech to speech)</em> voice-powered solutions in this stellar
        treasure trove.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {aiTools.map((tool, i) => (
          <div
            key={tool.name}
            ref={(el) => {
              containerRefs.current[i] = el;
            }}
            className="relative bg-white border border-black shadow-[4px_4px_0_0_black] px-6 py-8 flex flex-col items-center overflow-hidden"
          >
            <div
              ref={(el) => {
                imageRefs.current[i] = el;
              }}
              className="bg-transparent w-24 h-24 mb-4 flex items-center justify-center rounded relative z-10"
            >
              <Image src="/logo.png" alt="logo" width={40} height={40} />
            </div>
            <p className="mb-3 text-sm font-semibold text-gray-500">
              Powered By <span className="text-black">{tool.name}</span>
            </p>
            <button
              className="border text-black border-black px-4 py-1 font-mono text-sm hover:bg-black hover:text-white transition"
              onClick={() => triggerChaosBounce(i)}
            >
              CLICK ME
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
