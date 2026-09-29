import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Trophy, 
  Star, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Award,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const SPONSORS_CONFIG = {
  kanastra: {
    id: 'kanastra',
    name: 'Kanastra',
    tier: 'DIAMOND',
    tierLabel: 'Patrocinadora Diamante',
    required: true,
    logo: '/patrocinadores/Kanastra-Logo-Edited.png',
    accentColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    bgGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    tagBg: 'rgba(56, 189, 248, 0.15)',
    tagText: '#38BDF8',
    badgeDescription: 'Stand Principal na Área Tech',
    points: 50
  },
  bayer: {
    id: 'bayer',
    name: 'Bayer',
    tier: 'GOLD',
    tierLabel: 'Patrocinadora Ouro',
    required: true,
    logo: '/patrocinadores/LogoBayer.png',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, rgba(15, 23, 42, 0.95) 100%)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    tagBg: 'rgba(245, 158, 11, 0.15)',
    tagText: '#FBBF24',
    badgeDescription: 'Stand Inovação & AgroTech',
    points: 50
  },
  aimirim: {
    id: 'aimirim',
    name: 'Aimirim',
    tier: 'SILVER',
    tierLabel: 'Patrocinadora Prata',
    required: false,
    logo: '/patrocinadores/aimirim-logo.png',
    fallbackLogo: '/patrocinadores/W_Aimirim_med .png',
    accentColor: '#94A3B8',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    bgGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 20, 31, 0.9) 100%)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    tagBg: 'rgba(148, 163, 184, 0.12)',
    tagText: '#CBD5E1',
    badgeDescription: 'Stand Inteligência Industrial',
    points: 50
  },
  bip: {
    id: 'bip',
    name: 'Bip',
    tier: 'SILVER',
    tierLabel: 'Patrocinadora Prata',
    required: false,
    logo: '/patrocinadores/logo-bip-consulting-white.png',
    accentColor: '#94A3B8',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    bgGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 20, 31, 0.9) 100%)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    tagBg: 'rgba(148, 163, 184, 0.12)',
    tagText: '#CBD5E1',
    badgeDescription: 'Stand Consultoria & Transformação Digital',
    points: 50
  },
  hyperflow: {
    id: 'hyperflow',
    name: 'HyperFlow',
    tier: 'SILVER',
    tierLabel: 'Patrocinadora Prata',
    required: false,
    logo: '/patrocinadores/hyperflow-logo-secundario.png',
    accentColor: '#94A3B8',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    bgGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 20, 31, 0.9) 100%)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    tagBg: 'rgba(148, 163, 184, 0.12)',
    tagText: '#CBD5E1',
    badgeDescription: 'Stand Cloud & Automação High-Scale',
    points: 50
  }
};

export default function PassportTab({ userProfile }) {
  const [liveProfile, setLiveProfile] = useState(userProfile || {});

  // Escuta atualizações do Firestore em tempo real para carimbo instantâneo quando o patrocinador escanear
  useEffect(() => {
    const uid = auth?.currentUser?.uid || userProfile?.uid;
    if (!uid) return;

    try {
      const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setLiveProfile((prev) => ({
            ...prev,
            ...snap.data(),
            uid: snap.id
          }));
        }
      });
      return () => unsub();
    } catch (_err) {
      // Fallback gracioso
    }
  }, [userProfile?.uid]);

  const visitedSponsors = liveProfile?.visitedSponsors || userProfile?.visitedSponsors || {};
  const isGoldenTicket = liveProfile?.goldenTicketAwarded || userProfile?.goldenTicketAwarded || false;

  const kanastraVisited = !!visitedSponsors?.kanastra;
  const bayerVisited = !!visitedSponsors?.bayer;
  const aimirimVisited = !!visitedSponsors?.aimirim;
  const bipVisited = !!visitedSponsors?.bip;
  const hyperflowVisited = !!visitedSponsors?.hyperflow;

  const totalVisited = [kanastraVisited, bayerVisited, aimirimVisited, bipVisited, hyperflowVisited].filter(Boolean).length;
  const mandatoryCount = [kanastraVisited, bayerVisited].filter(Boolean).length;
  const partnerCount = [aimirimVisited, bipVisited, hyperflowVisited].filter(Boolean).length;

  // Elegível aos prêmios: Kanastra + Bayer (obrigatórias) + pelo menos 1 parceira
  const isEligibleForPrizes = kanastraVisited && bayerVisited && partnerCount >= 1;
  const isFullPassport = totalVisited === 5 || isGoldenTicket;

  const progressPercent = (totalVisited / 5) * 100;

  const formatVisitDate = (visitedAt) => {
    if (!visitedAt) return 'Visitado';
    try {
      const date = new Date(visitedAt);
      if (isNaN(date.getTime())) return 'Visitado';
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' de ' + date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return 'Visitado';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      {/* 1. HERO DO PASSAPORTE */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Glow de fundo */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <h2
          style={{
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          Roteiro dos Patrocinadores
        </h2>

        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.45 }}>
          Visite os estandes das empresas parceiras para ser escaneado. Cada visita garante <strong>+50 pontos</strong> no ranking e, ao escanear todas as empresas, você ainda <strong>libera uma pontuação extra</strong> (+100 pts bônus com o Bilhete Dourado)!
        </p>

        {/* Barra de Progresso Geral */}
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>Carimbos Coletados</span>
            <span style={{ color: '#38BDF8', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
              {totalVisited} de 5 empresas
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: isFullPassport
                  ? 'linear-gradient(90deg, #F59E0B, #EAB308, #FDE047)'
                  : 'linear-gradient(90deg, #38BDF8, #818CF8, #C084FC)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          {/* Status de Premiação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '0.74rem' }}>
            {isFullPassport ? (
              <span style={{ color: '#FDE047', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={14} color="#FDE047" />
                <span>Passaporte Completo! Bilhete Dourado ativo (+100 pts bônus)</span>
              </span>
            ) : isEligibleForPrizes ? (
              <span style={{ color: '#34D399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} color="#34D399" />
                <span>Elegível aos Sorteios! Escaneie todas para liberar a pontuação extra (+100 pts).</span>
              </span>
            ) : (
              <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} color="#F59E0B" />
                <span>Obrigatório: Kanastra ({kanastraVisited ? '✓' : '0/1'}) + Bayer ({bayerVisited ? '✓' : '0/1'}) + 1 parceira. Ao escanear todas, libera pontuação extra!</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. CARD DO BILHETE DOURADO (SE COMPLETO) */}
      {isFullPassport && (
        <section
          style={{
            background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
            borderRadius: '18px',
            border: '2px solid #FDE047',
            padding: '18px',
            color: '#FFFFFF',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}
          className="animate-fade-in"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: '#FEF08A',
                color: '#78350F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <Award size={32} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', color: '#FEF08A', textTransform: 'uppercase' }}>
                RECOMPENSA MÁXIMA DESBLOQUEADA
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 4px', color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}>
                🎟️ Bilhete Dourado TechWeek
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#FEF9C3', lineHeight: 1.4 }}>
                Você visitou todos os 5 estandes! Bônus de <strong>+100 pontos</strong> creditado no seu ranking e participação garantida em todos os sorteios de prêmios especiais.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* 3. TIER 1 - DIAMANTE: KANASTRA (CARD MASTER EM DESTAQUE)      */}
      {/* ============================================================ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            💎 Categoria Diamante
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8' }}>
            +50 Pontos
          </span>
        </div>

        <div
          style={{
            background: SPONSORS_CONFIG.kanastra.bgGradient,
            border: `1.5px solid ${kanastraVisited ? '#10B981' : SPONSORS_CONFIG.kanastra.borderColor}`,
            borderRadius: '20px',
            padding: '20px',
            boxShadow: kanastraVisited 
              ? '0 10px 30px rgba(16, 185, 129, 0.2)' 
              : '0 10px 30px rgba(56, 189, 248, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Bar do Card */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  backgroundColor: SPONSORS_CONFIG.kanastra.tagBg,
                  color: SPONSORS_CONFIG.kanastra.tagText,
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                PATROCINADORA DIAMANTE
              </span>

              <span
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>★</span>
                <span>OBRIGATÓRIO</span>
              </span>
            </div>

            {/* Carimbo Visual */}
            {kanastraVisited ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid #10B981',
                  color: '#34D399',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)'
                }}
              >
                <CheckCircle2 size={16} color="#34D399" />
                <span>CARIMBADO ✓</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94A3B8',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                <Clock size={13} />
                <span>Pendente</span>
              </div>
            )}
          </div>

          {/* Logo da Kanastra em Destaque Expandido */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              minHeight: '110px'
            }}
          >
            <img
              src={SPONSORS_CONFIG.kanastra.logo}
              alt="Kanastra"
              style={{
                maxHeight: '52px',
                maxWidth: '85%',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </div>

          {/* Footer do Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
            <span style={{ color: '#94A3B8' }}>{SPONSORS_CONFIG.kanastra.badgeDescription}</span>
            <span style={{ color: kanastraVisited ? '#34D399' : '#64748B', fontWeight: 600 }}>
              {kanastraVisited ? formatVisitDate(visitedSponsors.kanastra?.visitedAt) : 'Visita pendente no estande'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. TIER 2 - OURO: BAYER (CARD HIGH TIER)                      */}
      {/* ============================================================ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            🥇 Categoria Ouro
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8' }}>
            +50 Pontos
          </span>
        </div>

        <div
          style={{
            background: SPONSORS_CONFIG.bayer.bgGradient,
            border: `1.5px solid ${bayerVisited ? '#10B981' : SPONSORS_CONFIG.bayer.borderColor}`,
            borderRadius: '18px',
            padding: '18px',
            boxShadow: bayerVisited 
              ? '0 8px 24px rgba(16, 185, 129, 0.2)' 
              : '0 8px 24px rgba(245, 158, 11, 0.12)',
            position: 'relative'
          }}
        >
          {/* Top Bar Bayer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  backgroundColor: SPONSORS_CONFIG.bayer.tagBg,
                  color: SPONSORS_CONFIG.bayer.tagText,
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              >
                PATROCINADORA OURO
              </span>

              <span
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>★</span>
                <span>OBRIGATÓRIO</span>
              </span>
            </div>

            {/* Carimbo Visual */}
            {bayerVisited ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid #10B981',
                  color: '#34D399',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.74rem'
                }}
              >
                <CheckCircle2 size={15} color="#34D399" />
                <span>CARIMBADO ✓</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94A3B8',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  fontSize: '0.70rem',
                  fontWeight: 600
                }}
              >
                <Clock size={12} />
                <span>Pendente</span>
              </div>
            )}
          </div>

          {/* Logo da Bayer */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              minHeight: '85px'
            }}
          >
            <img
              src={SPONSORS_CONFIG.bayer.logo}
              alt="Bayer"
              style={{
                maxHeight: '46px',
                maxWidth: '80%',
                objectFit: 'contain'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span style={{ color: '#94A3B8' }}>{SPONSORS_CONFIG.bayer.badgeDescription}</span>
            <span style={{ color: bayerVisited ? '#34D399' : '#64748B', fontWeight: 600 }}>
              {bayerVisited ? formatVisitDate(visitedSponsors.bayer?.visitedAt) : 'Visita pendente no estande'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. TIER 3 - PRATA: AIMIRIM, BIP, HYPERFLOW (MESMO DESTAQUE)   */}
      {/* ============================================================ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            🥈 Categoria Prata (Parceiras de Tecnologia)
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8' }}>
            +50 Pontos cada
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {[SPONSORS_CONFIG.aimirim, SPONSORS_CONFIG.bip, SPONSORS_CONFIG.hyperflow].map((sponsor) => {
            const isVisited = !!visitedSponsors[sponsor.id];

            return (
              <div
                key={sponsor.id}
                style={{
                  background: sponsor.bgGradient,
                  border: `1.5px solid ${isVisited ? '#10B981' : sponsor.borderColor}`,
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isVisited ? '0 4px 16px rgba(16, 185, 129, 0.15)' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              >
                {/* Topo do Card Prata */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span
                    style={{
                      backgroundColor: sponsor.tagBg,
                      color: sponsor.tagText,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  >
                    PATROCINADORA PRATA
                  </span>

                  {isVisited ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.18)',
                        border: '1px solid #10B981',
                        color: '#34D399',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.70rem'
                      }}
                    >
                      <CheckCircle2 size={13} color="#34D399" />
                      <span>VISITADO ✓</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#64748B',
                        fontSize: '0.68rem',
                        fontWeight: 600
                      }}
                    >
                      <Clock size={12} />
                      <span>Pendente</span>
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '70px',
                    marginBottom: '12px'
                  }}
                >
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    onError={(e) => {
                      if (sponsor.fallbackLogo) {
                        e.currentTarget.src = sponsor.fallbackLogo;
                      }
                    }}
                    style={{
                      maxHeight: '38px',
                      maxWidth: '75%',
                      objectFit: 'contain'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem', color: '#94A3B8' }}>
                  <span>{sponsor.name}</span>
                  <span style={{ color: isVisited ? '#34D399' : '#64748B', fontWeight: isVisited ? 700 : 500 }}>
                    {isVisited ? formatVisitDate(visitedSponsors[sponsor.id]?.visitedAt) : 'Estande no evento'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
