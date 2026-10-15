import React from 'react';

export const TunasKelapaIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Lambang Tunas Kelapa Gerakan Pramuka"
  >
    {/* Stylized Silhouette of Tunas Kelapa (Indonesian Scout Silhouette) */}
    <path d="M50 8 C48 18 43 28 37 36 C32 43 24 50 18 56 C26 55 35 53 43 49 C42 55 42 62 44 68 C45 74 48 80 50 86 C52 80 55 74 56 68 C58 62 58 55 57 49 C65 53 74 55 82 56 C76 50 68 43 63 36 C57 28 52 18 50 8 Z" />
    <path d="M50 54 C46 54 42 58 42 63 C42 68 46 72 50 72 C54 72 58 68 58 63 C58 58 54 54 50 54 Z" opacity="0.9" />
    <path d="M46 74 C47 79 48 85 50 92 C52 85 53 79 54 74 Z" />
  </svg>
);

export const WosmIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Lambang WOSM (World Scout Emblem)"
  >
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="4 2" />
    <path d="M50 16 L53 38 C56 38 62 36 68 32 C65 42 59 47 54 50 C58 54 67 56 75 54 C67 60 59 60 53 58 C53 66 51 74 50 80 C49 74 47 66 47 58 C41 60 33 60 25 54 C33 56 42 54 46 50 C41 47 35 42 32 32 C38 36 44 38 47 38 Z" />
    <circle cx="50" cy="85" r="4" />
  </svg>
);

export const HasdukIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    fill="none"
  >
    {/* Red and White Scarf */}
    <path d="M10 20 L50 90 L90 20 Z" fill="#ffffff" stroke="#991b1b" strokeWidth="2" />
    <path d="M22 20 L50 80 L78 20 Z" fill="#dc2626" />
    <path d="M35 20 L50 65 L65 20 Z" fill="#ffffff" />
    <ellipse cx="50" cy="52" rx="12" ry="6" fill="#854d0e" stroke="#ca8a04" strokeWidth="2" />
  </svg>
);
