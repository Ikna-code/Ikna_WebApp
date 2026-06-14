"use client";

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface DesktopStickyProps {
  children: ReactNode;
  topOffset?: number;
  minDesktopWidth?: number;
  boundarySelector: string;
}

const DesktopSticky = ({
  children,
  topOffset = 80,
  minDesktopWidth = 1024,
  boundarySelector,
}: DesktopStickyProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [wrapperHeight, setWrapperHeight] = useState<number | null>(null);
  const [wrapperWidth, setWrapperWidth] = useState<number | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const isDesktop = () => window.innerWidth >= minDesktopWidth;

    const updateLayoutMeasurements = () => {
      if (!wrapper || !inner) return;
      const nextHeight = inner.getBoundingClientRect().height;
      const nextWidth = wrapper.getBoundingClientRect().width;
      setWrapperHeight(nextHeight);
      setWrapperWidth(nextWidth);
    };

    const updateSticky = () => {
      if (!wrapper || !inner) return;

      if (!isDesktop()) {
        setStyle({});
        return;
      }

      const boundary = document.querySelector(boundarySelector) as HTMLElement | null;
      if (!boundary) {
        setStyle({});
        return;
      }

      const scrollY = window.scrollY;
      const wrapperRect = wrapper.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();

      const wrapperTopAbs = wrapperRect.top + scrollY;
      const boundaryBottomAbs = boundaryRect.bottom + scrollY;
      const innerHeight = innerRect.height;
      const startStickAt = wrapperTopAbs - topOffset;

      // Keep the card fixed at topOffset while inside boundary,
      // then smoothly move it up as boundary end is reached.
      const maxTopForBoundary = boundaryBottomAbs - scrollY - innerHeight;

      if (scrollY <= startStickAt) {
        setStyle({});
        return;
      }

      const nextTop = Math.min(topOffset, maxTopForBoundary);
      setStyle({
        position: 'fixed',
        top: `${nextTop}px`,
        width: wrapperWidth ? `${wrapperWidth}px` : undefined,
        zIndex: 10,
      });
    };

    updateLayoutMeasurements();
    updateSticky();

    const resizeObserver = new ResizeObserver(() => {
      updateLayoutMeasurements();
      updateSticky();
    });

    resizeObserver.observe(wrapper);
    resizeObserver.observe(inner);

    const onResize = () => {
      updateLayoutMeasurements();
      updateSticky();
    };

    window.addEventListener('scroll', updateSticky, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateSticky);
      window.removeEventListener('resize', onResize);
    };
  }, [boundarySelector, minDesktopWidth, topOffset, wrapperWidth]);

  return (
    <div
      ref={wrapperRef}
      style={{ height: wrapperHeight ?? undefined }}
      className="w-full"
    >
      <div ref={innerRef} style={style} className="w-full">
        {children}
      </div>
    </div>
  );
};

export default DesktopSticky;
