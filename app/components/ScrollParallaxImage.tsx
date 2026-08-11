"use client";

import { CSSProperties, ReactNode, useEffect, useRef } from "react";

type ScrollParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  children?: ReactNode;
  strength?: number;
  scale?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function ScrollParallaxImage({
  src,
  alt,
  className = "",
  imageClassName,
  imageStyle,
  children,
  strength = 32,
  scale = 1.1,
  loading = "lazy",
  fetchPriority = "auto",
}: ScrollParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!container || reduceMotion.matches) return;

    let animationFrame = 0;
    let isVisible = false;

    const updatePosition = () => {
      animationFrame = 0;
      if (!isVisible) return;

      const bounds = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
      const mobileFactor = window.innerWidth <= 700 ? 0.58 : 1;
      const offset = (0.5 - progress) * strength * 2 * mobileFactor;
      container.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updatePosition);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        container.classList.toggle("is-parallax-active", isVisible);
        if (isVisible) scheduleUpdate();
      },
      { rootMargin: "15% 0px" },
    );

    observer.observe(container);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      container.classList.remove("is-parallax-active");
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [strength]);

  return (
    <div
      ref={containerRef}
      className={`scroll-parallax ${className}`.trim()}
      style={{ "--parallax-y": "0px", "--parallax-scale": scale } as CSSProperties}
    >
      <img
        className={imageClassName}
        src={src}
        alt={alt}
        style={imageStyle}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
      {children}
    </div>
  );
}
