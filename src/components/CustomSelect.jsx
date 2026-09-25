import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione uma opção',
  disabled = false,
  required = false,
  className = '',
  style = {},
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to array of { value, label }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value, label: opt.label ?? opt.value };
    }
    return { value: opt, label: opt };
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({
        target: {
          name,
          value: optionValue
        }
      });
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
      id={id}
    >
      {/* Hidden input to support standard form validation if needed */}
      <input
        type="hidden"
        name={name}
        value={value || ''}
        required={required}
      />

      <button
        type="button"
        className="login-input custom-select-trigger"
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '14px 16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid var(--primary, #3b82f6)' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: selectedOption ? '#ffffff' : 'var(--text-secondary, #9ca3af)',
          fontSize: '0.9rem',
          fontFamily: "'Montserrat', sans-serif",
          boxShadow: isOpen ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none',
          transition: 'all 0.25s ease',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: isOpen ? 'var(--primary, #3b82f6)' : '#9ca3af',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease, color 0.25s ease',
            flexShrink: 0
          }}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#0d1527',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '14px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(59, 130, 246, 0.15)',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            margin: 0,
            listStyle: 'none',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'customSelectFadeIn 0.2s ease-out'
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className="custom-select-option"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  minHeight: '44px', // Touch target for mobile / tablet
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? '#60a5fa' : '#f8fafc',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check size={16} style={{ color: '#60a5fa', marginLeft: '8px', flexShrink: 0 }} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
