import React from 'react';
import './MascotDuo.css';

export default function MascotDuo() {
  return (
    <div className="mascot-duo-container">
      <svg
        viewBox="0 0 350 200"
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-duo-svg"
      >
        <defs>
          <linearGradient id="bodyGrad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="bodyGrad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient id="accentGrad-blue" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="accentGrad-purple" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          <clipPath id="bodyClipAlan">
            <rect x="40" y="40" width="120" height="120" rx="16" />
          </clipPath>
          <clipPath id="bodyClipAda">
            <rect x="40" y="40" width="120" height="120" rx="16" />
          </clipPath>
        </defs>

        {/* --- ALAN (Blue, Left) --- */}
        <g transform="translate(10, 0)">
          {/* Alan's Right Arm (Holding hands) */}
          <path
            d="M 160 100 L 180 130 L 195 160"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
          />

          {/* Alan's Left Arm (Waving) */}
          <g className="mascot-arm mascot-arm-left">
            <path
              d="M 40 100 L 15 130 L 30 180"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="16"
              strokeLinejoin="bevel"
              strokeLinecap="square"
            />
            <rect x="20" y="170" width="20" height="20" rx="6" fill="#2563eb" />
          </g>

          {/* Alan's Body */}
          <rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bodyGrad-blue)" />
          
          {/* Geometric Accents */}
          <g clipPath="url(#bodyClipAlan)">
            <path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#accentGrad-blue)" />
            <path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)" />
          </g>

          {/* Alan's Left Eye */}
          <g className="mascot-eye mascot-eye-left">
            <rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
            <rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a" />
            <rect x="77" y="77" width="6" height="6" rx="2" fill="#fff" />
          </g>
          {/* Alan's Right Eye */}
          <g className="mascot-eye mascot-eye-right">
            <rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
            <rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a" />
            <rect x="127" y="77" width="6" height="6" rx="2" fill="#fff" />
          </g>
        </g>

        {/* --- ADA (Purple, Right) --- */}
        <g transform="translate(150, 0)">
          {/* Ada's Left Arm (Holding hands) */}
          <path
            d="M 40 100 L 20 130 L 5 160"
            fill="none"
            stroke="#4c1d95"
            strokeWidth="16"
            strokeLinejoin="bevel"
            strokeLinecap="square"
          />
          {/* Clasped hands */}
          <rect x="-5" y="150" width="20" height="20" rx="6" fill="#9333ea" />
          <rect x="-5" y="150" width="18" height="18" rx="6" fill="#2563eb" opacity="0.8" />

          {/* Ada's Right Arm (Waving) */}
          <g className="mascot-arm mascot-arm-right">
            <path
              d="M 160 100 L 185 130 L 170 180"
              fill="none"
              stroke="#4c1d95"
              strokeWidth="16"
              strokeLinejoin="bevel"
              strokeLinecap="square"
            />
            <rect x="160" y="170" width="20" height="20" rx="6" fill="#9333ea" />
          </g>

          {/* Ada's Body */}
          <rect x="40" y="40" width="120" height="120" rx="16" fill="url(#bodyGrad-purple)" />

          {/* Geometric Accents */}
          <g clipPath="url(#bodyClipAda)">
            <path d="M 40 160 L 160 40 L 160 160 Z" fill="url(#accentGrad-purple)" />
            <path d="M 40 100 L 100 40 L 160 40 L 40 160 Z" fill="rgba(255,255,255,0.08)" />
          </g>

          {/* Ada's Left Eye */}
          <g className="mascot-eye mascot-eye-left">
            <rect x="53" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
            <rect x="63" y="73" width="24" height="24" rx="6" fill="#0f172a" />
            <rect x="77" y="77" width="6" height="6" rx="2" fill="#fff" />
          </g>
          {/* Ada's Right Eye */}
          <g className="mascot-eye mascot-eye-right">
            <rect x="103" y="63" width="44" height="44" rx="10" fill="url(#eyeGrad)" />
            <rect x="113" y="73" width="24" height="24" rx="6" fill="#0f172a" />
            <rect x="127" y="77" width="6" height="6" rx="2" fill="#fff" />
          </g>
        </g>
      </svg>
    </div>
  );
}
