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

  const getRandom = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const triggerChaosBounce = (index: number) => {
    const el = imageRefs.current[index];
    if (!el) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

    const bounces = 4;
    for (let i = 0; i < bounces; i++) {
      const x = getRandom(-150, 150);
      const y = getRandom(-100, 100);
      const rot = getRandom(-90, 90);

      tl.to(el, {
        x,
        y,
        rotate: rot,
        duration: 0.4,
      }).to(el, {
        x: 0,
        y: 0,
        rotate: 0,
        duration: 0.3,
        ease: "bounce.out",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-12 text-center">
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
            className="bg-white border border-black shadow-[4px_4px_0_0_black] px-6 py-8 flex flex-col items-center relative overflow-hidden"
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
