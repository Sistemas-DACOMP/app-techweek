import React from 'react';
import './Mascot.css';

export default function Mascot({ color = 'blue', className = '', isCoveringEyes = false, isPeeking = false, isWaving = false, lookOffset = 0, lookOffsetY = 0 }) {
  // ... existing gradient code ...
  const getGradient = () => {
    if (color === 'purple') {
      return { start: '#9333ea', end: '#4c1d95' }; // Modern purple gradient
    }
    return { start: '#2563eb', end: '#1e3a8a' }; // Modern blue gradient
  };

  const gradient = getGradient();

  const cappedOffset = Math.min(Math.max(lookOffset, -8), 8);
  const cappedOffsetY = Math.min(Math.max(lookOffsetY, -8), 8);

  return (
    <div className={`mascot-container ${className}`}>
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-svg"
      >
        <defs>
          <linearGradient id={`bodyGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.start} />
            <stop offset="100%" stopColor={gradient.end} />
          </linearGradient>
          <linearGradient id={`accentGrad-${color}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradient.end} stopOpacity="0.4" />
            <stop offset="100%" stopColor={gradient.start} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          <clipPath id="bodyClip">
            <rect x="40" y="40" width="120" height="120" rx="16" />
          </clipPath>
        </defs>

        {/* Left Arm (Always covers if isCoveringEyes is true) */}
        <g className={!isCoveringEyes ? "mascot-arm mascot-arm-left" : ""} style={{ transition: 'all 0.3s ease' }}>
          <path
            d={isCoveringEyes ? "M 40 100 L 25 70 L 75 85" : "M 40 100 L 15 130 L 30 180"}
            fill="none"
            stroke={gradient.end}
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
            style={{ transition: 'd 0.3s ease' }}
          />
          <rect 
            x={isCoveringEyes ? "65" : "20"} 
            y={isCoveringEyes ? "75" : "170"} 
            width="20" height="20" rx="6" 
            fill={gradient.start} 
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>

        {/* Right Arm (Lowers if peeking, raises if waving) */}
        <g className={isWaving ? "mascot-arm-waving" : (!isCoveringEyes ? "mascot-arm mascot-arm-right" : "")} style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', transformOrigin: '160px 100px' }}>
          <path
            d={isCoveringEyes ? (isPeeking ? "M 160 100 L 180 120 L 135 130" : "M 160 100 L 175 70 L 125 85") : (isWaving ? "M 160 100 L 185 70 L 170 30" : "M 160 100 L 185 130 L 170 180")}
            fill="none"
            stroke={gradient.end}
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
            style={{ transition: 'd 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
          <rect 
            x={isCoveringEyes ? (isPeeking ? "125" : "115") : (isWaving ? "160" : "160")} 
            y={isCoveringEyes ? (isPeeking ? "120" : "75") : (isWaving ? "20" : "170")} 
            width="20" height="20" rx="6" 
            fill={gradient.start} 
            style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </g>

        {/* Body */}
        <rect
          x="40"
          y="40"
          width="120"
          height="120"
          rx="16"
          fill={`url(#bodyGrad-${color})`}
          className="mascot-body"
        />
        
        {/* Geometric Accents */}
        <g clipPath="url(#bodyClip)">
          <path d="M 40 160 L 160 40 L 160 160 Z" fill={`url(#accentGrad-${color})`} />
          <path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* Left Eye (Remains closed if covering eyes) */}
        <g className={!isCoveringEyes ? "mascot-eye mascot-eye-left" : ""}>
          {isCoveringEyes ? (
             <path d="M 55 85 L 75 75 L 95 85" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="square" />
          ) : (
            <>
              <rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
              <rect x={63 + cappedOffset} y={73 + cappedOffsetY} width="24" height="24" rx="6" fill="#0f172a" style={{ transition: 'all 0.1s ease-out' }} />
              <rect x={77 + cappedOffset} y={77 + cappedOffsetY} width="6" height="6" rx="2" fill="#fff" style={{ transition: 'all 0.1s ease-out' }} />
            </>
          )}
        </g>

        {/* Right Eye (Opens if peeking) */}
        <g className={!isCoveringEyes || isPeeking ? "mascot-eye mascot-eye-right" : ""}>
          {isCoveringEyes && !isPeeking ? (
             <path d="M 105 85 L 125 75 L 145 85" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="square" />
          ) : (
            <>
              <rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
              <rect x={113 + (isPeeking ? 3 : cappedOffset)} y={73 + (isPeeking ? 6 : cappedOffsetY)} width="24" height="24" rx="6" fill="#0f172a" style={{ transition: 'all 0.1s ease-out' }} />
              <rect x={127 + (isPeeking ? 3 : cappedOffset)} y={77 + (isPeeking ? 6 : cappedOffsetY)} width="6" height="6" rx="2" fill="#fff" style={{ transition: 'all 0.1s ease-out' }} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
