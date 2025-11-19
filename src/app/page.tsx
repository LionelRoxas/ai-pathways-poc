/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Particles from "./components/Particles";
import Link from "next/link";

export default function MainPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartChat = () => {
    router.push("/chat");
  };

  return (
    <div
      className="h-screen w-screen bg-emerald-900 flex items-center justify-center overflow-hidden relative"
      style={{
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Particles background */}
      <Particles
        className="absolute inset-0 z-0"
        particleColors={["#ffffff", "#ffffff"]}
        particleCount={200}
        particleSpread={30}
        speed={0.1}
        particleBaseSize={200}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />

      {/* Green glow overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.25) 0%, transparent 70%)",
        }}
      />

      {/* Simple corner logo */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-sm font-medium text-white">
              Kamaʻāina Pathways
            </span>
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <div
        className={`max-w-4xl px-8 text-center transition-all duration-1000 relative z-20 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
          Find Your Path In Hawaiʻi
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-200 mb-16 max-w-2xl mx-auto font-light leading-relaxed">
          Have a conversation with AI about your interests and discover
          education and career opportunities.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={handleStartChat}
            className="group bg-emerald-600 hover:bg-emerald-400 text-white px-10 py-5 rounded-full text-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-3 min-w-[220px] justify-center shadow-lg shadow-emerald-900/50"
          >
            <span>Start talking</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <Link
            href="/learn-more"
            className="text-gray-200 hover:text-white px-10 py-5 text-lg transition-colors font-medium"
          >
            Learn more
          </Link>
        </div>

        {/* Simple footer text */}
        <div className="mt-20 text-sm text-gray-300">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/images/uhcc-logo-3.png"
              alt="UHCC Logo"
              className="w-10 h-10 object-contain"
            />
            <span>Sponsored by UHCC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
