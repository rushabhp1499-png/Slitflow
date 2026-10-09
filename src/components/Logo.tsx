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
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            className={`font-normal tracking-normal text-sm block ${
              lightText ? 'text-white' : 'text-slate-900'
            }`}
          >
            Progressive Enterprises
          </span>
          <span
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            className={`text-[10px] tracking-wider uppercase block font-normal ${
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
