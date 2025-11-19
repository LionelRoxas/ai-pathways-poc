"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Camera, Geometry, Program, Mesh } from "ogl";

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
};

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 400,
  particleSpread = 30,
  speed = 0.1,
  particleColors = ["#ffffff", "#ffffff"],
  moveParticlesOnHover = true,
  particleHoverFactor = 2,
  alphaParticles = false,
  particleBaseSize = 200,
  sizeRandomness = 1,
  cameraDistance = 15,
  disableRotation = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new Renderer({ canvas, dpr: 2, alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 45 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener("resize", resize);
    resize();

    // Create geometry
    const numParticles = particleCount;
    const positions = new Float32Array(numParticles * 3);
    const randoms = new Float32Array(numParticles);
    const colors = new Float32Array(numParticles * 3);

    for (let i = 0; i < numParticles; i++) {
      positions.set(
        [
          (Math.random() - 0.5) * particleSpread,
          (Math.random() - 0.5) * particleSpread,
          (Math.random() - 0.5) * particleSpread,
        ],
        i * 3
      );
      randoms[i] = Math.random();

      // Assign colors from the provided palette
      const colorIndex = Math.floor(Math.random() * particleColors.length);
      const rgb = hexToRgb(particleColors[colorIndex]);
      colors.set(rgb, i * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 1, data: randoms },
      color: { size: 3, data: colors },
    });

    const vertex = /* glsl */ `
      attribute vec3 position;
      attribute float random;
      attribute vec3 color;

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uSpeed;
      uniform float uHoverFactor;
      uniform float uBaseSize;
      uniform float uSizeRandomness;

      varying vec3 vColor;

      void main() {
        vColor = color;
        
        vec3 pos = position;
        
        // Apply rotation if not disabled
        float rotationSpeed = uSpeed * 0.2;
        float angle = uTime * rotationSpeed;
        mat3 rotationY = mat3(
          cos(angle), 0.0, sin(angle),
          0.0, 1.0, 0.0,
          -sin(angle), 0.0, cos(angle)
        );
        pos = rotationY * pos;
        
        // Apply mouse interaction
        vec2 mouseInfluence = uMouse * uHoverFactor;
        pos.x += mouseInfluence.x * random;
        pos.y += mouseInfluence.y * random;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Calculate size
        float sizeFactor = uBaseSize + (random * uSizeRandomness);
        gl_PointSize = sizeFactor * (1.0 / -mvPosition.z);
      }
    `;

    const fragment = /* glsl */ `
      precision highp float;

      uniform bool uAlpha;
      varying vec3 vColor;

      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = uAlpha ? (1.0 - dist * 2.0) : 1.0;
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uSpeed: { value: speed },
        uHoverFactor: { value: moveParticlesOnHover ? particleHoverFactor : 0 },
        uAlpha: { value: alphaParticles },
        uBaseSize: { value: particleBaseSize },
        uSizeRandomness: { value: sizeRandomness },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });

    // Mouse tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    let animationId: number;
    const animate = (t: number) => {
      animationId = requestAnimationFrame(animate);

      // Smooth mouse movement
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      if (!disableRotation) {
        program.uniforms.uTime.value = t * 0.001;
      }
      program.uniforms.uMouse.value = [mouse.x * 0.1, mouse.y * 0.1];

      renderer.render({ scene: mesh, camera });
    };
    animate(0);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    particleColors,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
  ]);

  return <canvas ref={canvasRef} className={className} />;
};

export default Particles;
