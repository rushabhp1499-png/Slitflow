import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  showText?: boolean;
  lightText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = 'h-8 w-auto',
  showText = false,
  lightText = false,
}) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/pe-logo.svg"
        alt="Progressive Enterprises Logo"
        className={`${className} object-contain shrink-0`}
      />
      {showText && (
        <div className="leading-tight">
          <span
            className={`font-black tracking-tight text-sm block ${
              lightText ? 'text-white' : 'text-slate-900'
            }`}
          >
            PROGRESSIVE ENTERPRISES
          </span>
          <span
            className={`text-[10px] tracking-wider uppercase block ${
              lightText ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Precision Slitting Works
          </span>
        </div>
      )}
    </div>
  );
};
