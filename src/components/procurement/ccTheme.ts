import type { CSSProperties } from 'react';

// Dark theme is scoped to the Command Center only. The rest of the ERP stays light.
export const CC = {
  bg: '#030712',
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  borderSoft: 'rgba(255,255,255,0.06)',
  blue: '#3B82F6',
  cyan: '#22D3EE',
  violet: '#8B5CF6',
  orange: '#FB923C',
  green: '#22C55E',
  red: '#EF4444',
  textHi: '#F1F5F9',
  textMid: '#94A3B8',
  textLo: '#5B6577',
};

export const glass = (extra: CSSProperties = {}): CSSProperties => ({
  background: CC.glass,
  border: `1px solid ${CC.border}`,
  borderRadius: 20,
  ...extra,
});
