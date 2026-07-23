"use client";

import { useEffect, useRef, useState } from 'react';

export default function LazySection({
  children,
  className = '',
  rootMargin = '220px 0px',
}: {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref} className={className}>{isVisible ? children : null}</div>;
}
