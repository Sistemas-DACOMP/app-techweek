import React from 'react';
import './Mascot.css';

export default function Mascot({
  color,
  name,
  mood,
  size,
  className = '',
  style = {},
  isCoveringEyes = false,
  isPeeking = false,
  isWaving = false,
  lookOffset = 0,
  lookOffsetY = 0,
}) {
  // Resolução de Cor e Nome (DESIGN.md §8: Alan = azul #2563EB → #1E3A8A, Ada = roxa #9333EA → #4C1D95)
  const resolvedColor = color || (name?.toLowerCase() === 'ada' ? 'purple' : 'blue');
  const mascotName = name ? (name.toLowerCase() === 'ada' ? 'Ada' : 'Alan') : (resolvedColor === 'purple' ? 'Ada' : 'Alan');

  // Resolução de Mood
  const resolvedWaving = isWaving || mood === 'waving' || mood === 'happy';
  const resolvedPeeking = isPeeking || mood === 'peeking';
  const resolvedCoveringEyes = isCoveringEyes || mood === 'coveringEyes' || mood === 'sad' || mood === 'error';

  // Resolução de Tamanho (DESIGN.md §8: 28, 44, 50-52, 56, 64-76, 112-150)
  const sizeStyle = size != null
    ? {
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
      }
    : {};

  const combinedStyle = { ...sizeStyle, ...style };

  const getGradient = () => {
    if (resolvedColor === 'purple') {
      return { start: '#9333ea', end: '#4c1d95' }; // Modern purple gradient (Ada)
    }
    return { start: '#2563eb', end: '#1e3a8a' }; // Modern blue gradient (Alan)
  };

  const gradient = getGradient();

  const cappedOffset = Math.min(Math.max(lookOffset, -8), 8);
  const cappedOffsetY = Math.min(Math.max(lookOffsetY, -8), 8);

  const gradSuffix = `${resolvedColor}`;

  return (
    <div
      className={`mascot-container mascot-name-${mascotName.toLowerCase()} ${mood ? `mascot-mood-${mood}` : ''} ${className}`.trim().replace(/\s+/g, ' ')}
      style={combinedStyle}
      role="img"
      aria-label={`Mascote ${mascotName}${mood ? ` (${mood})` : ''}`}
    >
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-svg"
      >
        <defs>
          <linearGradient id={`bodyGrad-${gradSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.start} />
            <stop offset="100%" stopColor={gradient.end} />
          </linearGradient>
          <linearGradient id={`accentGrad-${gradSuffix}`} x1="0%" y1="100%" x2="100%" y2="0%">
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

        {/* Left Arm (Always covers if resolvedCoveringEyes is true) */}
        <g className={!resolvedCoveringEyes ? "mascot-arm mascot-arm-left" : ""} style={{ transition: 'all 0.3s ease' }}>
          <path
            d={resolvedCoveringEyes ? "M 40 100 L 25 70 L 75 85" : "M 40 100 L 15 130 L 30 180"}
            fill="none"
            stroke={gradient.end}
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
            style={{ transition: 'd 0.3s ease' }}
          />
          <rect 
            x={resolvedCoveringEyes ? "65" : "20"} 
            y={resolvedCoveringEyes ? "75" : "170"} 
            width="20" height="20" rx="6" 
            fill={gradient.start} 
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>

        {/* Right Arm (Lowers if peeking, raises if waving) */}
        <g className={resolvedWaving ? "mascot-arm-waving" : (!resolvedCoveringEyes ? "mascot-arm mascot-arm-right" : "")} style={{ transition: 'all 0.3s ease', transformOrigin: '160px 100px' }}>
          <path
            d={resolvedCoveringEyes ? (resolvedPeeking ? "M 160 100 L 175 90 L 125 105" : "M 160 100 L 175 70 L 125 85") : (resolvedWaving ? "M 160 100 L 185 70 L 170 30" : "M 160 100 L 185 130 L 170 180")}
            fill="none"
            stroke={gradient.end}
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
            style={{ transition: 'd 0.3s ease' }}
          />
          <rect 
            x={resolvedCoveringEyes ? (resolvedPeeking ? "115" : "115") : (resolvedWaving ? "160" : "160")} 
            y={resolvedCoveringEyes ? (resolvedPeeking ? "95" : "75") : (resolvedWaving ? "20" : "170")} 
            width="20" height="20" rx="6" 
            fill={gradient.start} 
            style={{ transition: 'all 0.3s ease' }}
          />
        </g>

        {/* Body */}
        <rect
          x="40"
          y="40"
          width="120"
          height="120"
          rx="16"
          fill={`url(#bodyGrad-${gradSuffix})`}
          className="mascot-body"
        />
        
        {/* Geometric Accents */}
        <g clipPath="url(#bodyClip)">
          <path d="M 40 160 L 160 40 L 160 160 Z" fill={`url(#accentGrad-${gradSuffix})`} />
          <path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* Left Eye (Remains closed if covering eyes) */}
        <g className={!resolvedCoveringEyes ? "mascot-eye mascot-eye-left" : ""}>
          {resolvedCoveringEyes ? (
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
        <g className={!resolvedCoveringEyes || resolvedPeeking ? "mascot-eye mascot-eye-right" : ""}>
          {resolvedCoveringEyes && !resolvedPeeking ? (
             <path d="M 105 85 L 125 75 L 145 85" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="square" />
          ) : (
            <>
              <rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
              <rect x={113 + cappedOffset} y={73 + cappedOffsetY} width="24" height="24" rx="6" fill="#0f172a" style={{ transition: 'all 0.1s ease-out' }} />
              <rect x={127 + cappedOffset} y={77 + cappedOffsetY} width="6" height="6" rx="2" fill="#fff" style={{ transition: 'all 0.1s ease-out' }} />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
