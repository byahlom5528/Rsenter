import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-label="לוגו האתר"
    >
      {/* 1. Top-Left Face */}
      <polygon
        points="244,25 12,365 238,248"
        fill="currentColor"
      />

      {/* 2. Top-Right Face */}
      <polygon
        points="256,25 488,360 254,242"
        fill="currentColor"
      />

      {/* 3. Bottom-Left Face */}
      <polygon
        points="10,392 238,266 354,475"
        fill="currentColor"
      />

      {/* 4. Bottom-Right Face */}
      <polygon
        points="258,260 484,380 372,475"
        fill="currentColor"
      />
    </svg>
  );
};
