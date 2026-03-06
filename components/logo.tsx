'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/contexts/theme-context';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'auto' | 'white' | 'green';
}

export function Logo({ className = '', width = 180, height = 50, variant = 'auto' }: LogoProps) {
  const { theme } = useTheme();
  
  let logoSrc: string;
  if (variant === 'white') {
    logoSrc = '/images/logo-white.png';
  } else if (variant === 'green') {
    logoSrc = '/images/logo-green.png';
  } else {
    logoSrc = theme === 'dark' ? '/images/logo-white.png' : '/images/logo-green.png';
  }
  
  return (
    <Image
      src={logoSrc}
      alt="OriginTrace"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

export function LogoIcon({ className = '', size = 40 }: { className?: string; size?: number }) {
  const { theme } = useTheme();
  
  const iconSrc = theme === 'dark' ? '/images/icon-green.png' : '/images/icon-green.png';
  
  return (
    <Image
      src={iconSrc}
      alt="OriginTrace"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
