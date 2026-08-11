"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uPulse;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float impact = uEnergy * 0.55 + uPulse * 0.8;
    float waveA = sin(pos.y * 1.55 + uTime * 0.72 + uPointer.y) * (0.24 + impact * 0.16);
    float waveB = cos(pos.x * 2.4 - uTime * 0.54 + uPointer.x * 1.4) * (0.17 + impact * 0.10);
    float waveC = sin((pos.x + pos.y) * 1.45 + uTime * 0.38) * 0.13;
    float pointerField = exp(-pow(pos.y - uPointer.y * 2.6, 2.0) * 0.15);
    pos.z += waveA + waveB + waveC + pointerField * uPointer.x * 0.32;
    pos.x += sin(pos.y * 0.78 + uTime * 0.34) * (0.22 + impact * 0.08);
    vWave = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uPulse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec2 vUv;
  varying float vWave;

  float softBand(float x, float center, float width) {
    return 1.0 - smoothstep(0.0, width, abs(x - center));
  }

  void main() {
    float sweep = vUv.x + sin(vUv.y * 6.0 + uTime * 0.34) * 0.17 + vWave * 0.035;
    float sheen = softBand(sweep, 0.56, 0.3);
    float hotSheen = pow(max(sheen, 0.0), 5.0);
    float threads = sin(vUv.x * 240.0 + vUv.y * 9.0 + uTime * 0.18) * 0.022;
    float foldLight = smoothstep(-0.2, 0.42, vWave) * 0.24;
    vec3 color = mix(uColorA, uColorB, sheen * 0.92 + foldLight);
    color = mix(color, uColorC, hotSheen * (0.56 + uPulse * 0.24));
    color += threads + uEnergy * sheen * 0.1;
    float centerLine = vUv.x - 0.5 + sin(vUv.y * 4.2 + uTime * 0.22) * 0.08;
    float ribbon = 1.0 - smoothstep(0.3, 0.5, abs(centerLine));
    float alpha = ribbon * (0.58 + sheen * 0.32 + uPulse * 0.08);
    gl_FragColor = vec4(color, alpha);
  }
`;

const palettes = [
  [new THREE.Color("#2a030a"), new THREE.Color("#bd3147"), new THREE.Color("#ffe0c8")],
  [new THREE.Color("#120b08"), new THREE.Color("#9b4f2b"), new THREE.Color("#f7c693")],
  [new THREE.Color("#09090b"), new THREE.Color("#65545f"), new THREE.Color("#f7e9df")],
];

export function HeroScene({ activeIndex }: { activeIndex: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const visualState = useRef({ activeIndex, pulse: 1 });

  useEffect(() => {
    visualState.current.activeIndex = activeIndex;
    visualState.current.pulse = 1;
  }, [activeIndex]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const interactionTarget = mount.parentElement ?? mount;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    const baseCameraX = isMobile ? 0.2 : 0.75;
    const baseSilkRotationY = isMobile ? -0.1 : -0.28;
    const baseSilkX = isMobile ? 1.15 : 1.05;
    camera.position.set(baseCameraX, 0, isMobile ? 7.35 : 6.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance", premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.55 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const initialPalette = palettes[activeIndex] ?? palettes[0];
    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uPulse: { value: 1 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: initialPalette[0].clone() },
      uColorB: { value: initialPalette[1].clone() },
      uColorC: { value: initialPalette[2].clone() },
    };
    const silkGeometry = new THREE.PlaneGeometry(isMobile ? 4.25 : 5.1, isMobile ? 9.0 : 9.7, isMobile ? 64 : 102, isMobile ? 96 : 142);
    const silkMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const silk = new THREE.Mesh(silkGeometry, silkMaterial);
    silk.rotation.z = isMobile ? -0.18 : -0.39;
    silk.rotation.y = baseSilkRotationY;
    silk.position.set(baseSilkX, 0, -0.15);
    scene.add(silk);

    const count = isMobile ? 130 : 320;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 2.0 + Math.random() * 4.5;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius + 0.7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.4;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xffd6ca, size: isMobile ? 0.024 : 0.032, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const targetPointer = new THREE.Vector2();
    let targetEnergy = 0;
    const onPointerMove = (event: PointerEvent) => {
      const bounds = interactionTarget.getBoundingClientRect();
      const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const nextY = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      targetEnergy = Math.min(1, targetEnergy + targetPointer.distanceTo(new THREE.Vector2(nextX, nextY)) * 2.8);
      targetPointer.set(nextX, nextY);
    };
    const onPointerLeave = () => targetPointer.set(0, 0);
    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.55 : 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    interactionTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    interactionTarget.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let animationFrame = 0;
    let inView = true;
    const render = () => {
      animationFrame = 0;
      const elapsed = clock.getElapsedTime();
      const state = visualState.current;
      const palette = palettes[state.activeIndex] ?? palettes[0];
      uniforms.uTime.value = reducedMotion ? 1.5 : elapsed;
      uniforms.uPointer.value.lerp(targetPointer, reducedMotion ? 1 : 0.085);
      targetEnergy *= 0.9;
      uniforms.uEnergy.value = THREE.MathUtils.lerp(uniforms.uEnergy.value, targetEnergy, 0.12);
      uniforms.uPulse.value = state.pulse;
      state.pulse *= 0.94;
      uniforms.uColorA.value.lerp(palette[0], 0.045);
      uniforms.uColorB.value.lerp(palette[1], 0.045);
      uniforms.uColorC.value.lerp(palette[2], 0.045);
      if (!reducedMotion) {
        silk.rotation.y = baseSilkRotationY + uniforms.uPointer.value.x * 0.14;
        silk.rotation.x = uniforms.uPointer.value.y * 0.055;
        silk.position.x = baseSilkX + uniforms.uPointer.value.x * 0.18;
        camera.position.x = baseCameraX + uniforms.uPointer.value.x * 0.12;
        camera.position.y = uniforms.uPointer.value.y * 0.08;
        particles.rotation.y = elapsed * 0.045 + uniforms.uPointer.value.x * 0.03;
        particles.rotation.z = Math.sin(elapsed * 0.16) * 0.055;
      }
      renderer.render(scene, camera);
      if (!reducedMotion && inView && !document.hidden) animationFrame = requestAnimationFrame(render);
    };
    const resume = () => {
      if (!reducedMotion && inView && !document.hidden && !animationFrame) animationFrame = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) resume();
      else if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
    }, { threshold: 0.02 });
    const onVisibilityChange = () => {
      if (document.hidden && animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
      else resume();
    };
    observer.observe(mount);
    document.addEventListener("visibilitychange", onVisibilityChange);
    render();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      interactionTarget.removeEventListener("pointermove", onPointerMove);
      interactionTarget.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      silkGeometry.dispose();
      silkMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-hidden="true" />;
}
