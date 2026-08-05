'use client';

import { useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';

interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function toHSLString(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function generateForeground(hsl: { h: number; s: number; l: number }): string {
  return hsl.l > 55 ? `${hsl.h} ${hsl.s}% 10%` : `0 0% 100%`;
}

function adjustLightness(hsl: { h: number; s: number; l: number }, delta: number): { h: number; s: number; l: number } {
  return { h: hsl.h, s: hsl.s, l: Math.max(0, Math.min(100, hsl.l + delta)) };
}

const OVERRIDDEN_VARS = [
  '--primary', '--primary-foreground', '--ring',
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  '--accent', '--accent-foreground',
  '--tenant-primary', '--tenant-primary-foreground',
  '--tenant-secondary', '--tenant-secondary-foreground',
  '--tenant-accent', '--tenant-accent-foreground',
];

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrg();

  useEffect(() => {
    const root = document.documentElement;
    const brandColors = (organization as any)?.brand_colors as BrandColors | undefined;

    if (!brandColors || (!brandColors.primary && !brandColors.secondary && !brandColors.accent)) {
      OVERRIDDEN_VARS.forEach(v => root.style.removeProperty(v));
      return;
    }

    const isDark = root.classList.contains('dark');

    if (brandColors.primary) {
      const hsl = hexToHSL(brandColors.primary);
      if (hsl) {
        const displayHSL = isDark ? adjustLightness(hsl, 8) : hsl;
        const darkened = adjustLightness(hsl, isDark ? -15 : -10);
        const sidebarBg = adjustLightness(hsl, isDark ? -20 : -12);
        const sidebarAccent = adjustLightness(hsl, isDark ? -10 : -5);

        root.style.setProperty('--primary', toHSLString(displayHSL));
        root.style.setProperty('--primary-foreground', generateForeground(displayHSL));
        root.style.setProperty('--ring', toHSLString(displayHSL));

        root.style.setProperty('--sidebar-background', toHSLString(sidebarBg));
        root.style.setProperty('--sidebar-foreground', '0 0% 98%');
        root.style.setProperty('--sidebar-primary', '0 0% 100%');
        root.style.setProperty('--sidebar-primary-foreground', toHSLString(sidebarBg));
        root.style.setProperty('--sidebar-accent', toHSLString(sidebarAccent));
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 98%');
        root.style.setProperty('--sidebar-border', toHSLString(adjustLightness(sidebarBg, 4)));
        root.style.setProperty('--sidebar-ring', '0 0% 100%');

        root.style.setProperty('--tenant-primary', toHSLString(displayHSL));
        root.style.setProperty('--tenant-primary-foreground', generateForeground(displayHSL));
      }
    }

    if (brandColors.secondary) {
      const hsl = hexToHSL(brandColors.secondary);
      if (hsl) {
        root.style.setProperty('--tenant-secondary', toHSLString(hsl));
        root.style.setProperty('--tenant-secondary-foreground', generateForeground(hsl));
      }
    }

    if (brandColors.accent) {
      const hsl = hexToHSL(brandColors.accent);
      if (hsl) {
        const displayHSL = isDark ? adjustLightness(hsl, 5) : hsl;
        const accentBg = isDark
          ? adjustLightness(hsl, -30)
          : adjustLightness(hsl, 40);

        root.style.setProperty('--accent', toHSLString(accentBg));
        root.style.setProperty('--accent-foreground', toHSLString(isDark ? adjustLightness(hsl, 20) : adjustLightness(hsl, -20)));
        root.style.setProperty('--tenant-accent', toHSLString(displayHSL));
        root.style.setProperty('--tenant-accent-foreground', generateForeground(displayHSL));
      }
    }

    return () => {
      OVERRIDDEN_VARS.forEach(v => root.style.removeProperty(v));
    };
  }, [organization]);

  return <>{children}</>;
}
