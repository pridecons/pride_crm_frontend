'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Minimal Logo
 * Props:
 * - src: light/default logo path (string)  e.g. "/crm.png"
 * - darkSrc: optional dark-mode logo path (string) e.g. "/crm-dark.png"
 * - alt: string (default: "Logo")
 * - width, height: numbers for intrinsic size (defaults 128x40)
 * - href: optional link. if provided, wraps in <Link>
 * - className: optional classes applied to the <Image/>
 */
export default function Logo({
  src = '/crm.png',
  darkSrc,
  alt = 'Logo',
  width = 128,
  height = 40,
  href,
  className,
}) {
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode via Tailwind's `dark` class or system preference (no theme context needed)
  useEffect(() => {
    const hasDarkClass = () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');

    const mm = typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-color-scheme: dark)')
      : null;

    const update = () => setIsDark(hasDarkClass() || !!mm?.matches);
    update();

    mm?.addEventListener?.('change', update);
    return () => mm?.removeEventListener?.('change', update);
  }, []);

  const img = (
    <Image
      src={isDark && darkSrc ? darkSrc : src}
      alt={alt}
      width={width}
      height={height}
      className={className || 'object-contain select-none'}
      priority
    />
  );

  if (href) return <Link href={href} aria-label="Home">{img}</Link>;
  return img;
}
