import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, X, Clock } from 'lucide-react';
import { FLASH_ALERT_KEY, FLASH_EVENT_NAME } from '../lib/missionsManager';

const ALERT_DURATION_MS = 10000; // 10 segundos

export default function FlashMissionAlert() {
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const lastAlertIdRef = useRef(null);

  const startCountdown = (mission) => {
    if (!mission) return;
    setActiveAlert(mission);
    setTimeLeft(10);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((ALERT_DURATION_MS - elapsed) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
      }
    }, 200);

    timerRef.current = setTimeout(() => {
      setActiveAlert(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, ALERT_DURATION_MS);
  };

  const handleDismiss = () => {
    setActiveAlert(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleGoToMission = () => {
    const missionId = activeAlert?.id;
    handleDismiss();
    navigate('/challenges', { state: { autoOpenMissionId: missionId } });
  };

  useEffect(() => {
    // Escuta evento customizado disparado na mesma aba
    const handleCustomAlert = (event) => {
      const data = event.detail;
      if (data?.mission && data?.triggeredAt) {
        lastAlertIdRef.current = `${data.mission.id}_${data.triggeredAt}`;
        startCountdown(data.mission);
      }
    };

    // Escuta storage event disparado entre diferentes abas
    const handleStorage = (event) => {
      if (event.key === FLASH_ALERT_KEY && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          const alertId = `${data.mission?.id}_${data.triggeredAt}`;
          if (data.mission && alertId !== lastAlertIdRef.current) {
            // Verifica se o alerta foi disparado há menos de 10 segundos
            const diff = Date.now() - (data.triggeredAt || 0);
            if (diff < ALERT_DURATION_MS) {
              lastAlertIdRef.current = alertId;
              startCountdown(data.mission);
            }
          }
        } catch {
          // Ignora parsing error
        }
      }
    };

    window.addEventListener(FLASH_EVENT_NAME, handleCustomAlert);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(FLASH_EVENT_NAME, handleCustomAlert);
      window.removeEventListener('storage', handleStorage);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!activeAlert) return null;

  return (
    <div className="flash-alert-backdrop animate-fade-in" onClick={handleDismiss}>
      <div className="flash-alert-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Animated Lightning Header */}
        <div className="flash-alert-header">
          <div className="flash-alert-icon-wrap">
            <Zap size={28} className="flash-zap-pulse" color="#38bdf8" />
          </div>
          <div className="flash-badge-pill">
            ⚡ MISSÃO RELÂMPAGO
          </div>
          <button
            type="button"
            className="flash-close-btn"
            onClick={handleDismiss}
            aria-label="Fechar alerta"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flash-alert-body">
          <h2 className="flash-alert-title">{activeAlert.name}</h2>
          <p className="flash-alert-desc">{activeAlert.description}</p>
          
          <div className="flash-points-row">
            <span className="flash-points-tag">+{activeAlert.points} PONTOS</span>
            <span className="flash-timer-tag">
              <Clock size={13} />
              <span>Some em {timeLeft}s</span>
            </span>
          </div>

          {/* Progress countdown bar */}
          <div className="flash-progress-track">
            <div className="flash-progress-bar" style={{ animationDuration: '10s' }} />
          </div>
        </div>

        {/* Action Button */}
        <div className="flash-alert-footer">
          <button
            type="button"
            className="flash-btn-accept"
            onClick={handleGoToMission}
          >
            <span>Ver Missão no App</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
