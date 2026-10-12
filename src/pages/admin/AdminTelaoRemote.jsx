import { useState } from 'react';
import { Monitor, QrCode, CheckCircle2, Calendar, Trophy, Megaphone } from 'lucide-react';
import { getStageDisplayMode, setStageDisplayMode, STAGE_MODES } from '../../lib/liveOpsService';

/* Controle remoto do telão (Visão geral): faixa de largura total, 5 modos lado a lado.
   Troca o modo via liveOpsService; todos os monitores acompanham. */

// Cor e texto de cada modo (copy do design); modo desconhecido cai no texto do serviço.
const MODE_UI = {
  presenca: { icon: QrCode, color: 'var(--cat-minicurso)', label: 'QR de presença', desc: 'QR oficial para contar presença e pontos' },
  fechamento: { icon: CheckCircle2, color: 'var(--ok)', label: 'QR de fechamento', desc: 'Encerramento com avaliação e +10 XP' },
  agenda: { icon: Calendar, color: 'var(--link)', label: 'Agenda ao vivo', desc: 'O que acontece agora e o que vem a seguir' },
  ranking: { icon: Trophy, color: 'var(--light-yellow)', label: 'Top 10 da gamificação', desc: 'Placar com quem mais pontuou' },
  feed: { icon: Megaphone, color: 'var(--cat-workshop)', label: 'Mural de avisos', desc: 'Avisos da organização e posts oficiais' },
};

export default function AdminTelaoRemote({ highlight, onOpenTelao }) {
  const [mode, setMode] = useState(() => getStageDisplayMode());

  const pick = (id) => {
    setStageDisplayMode(id);
    setMode(id);
    if (highlight && onOpenTelao) onOpenTelao(highlight);
  };

  return (
    <section aria-labelledby="adm-telao-ctrl" className="mt-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <div className="mb-1 flex items-center justify-between gap-3 lg:mb-3.5">
        <h2 id="adm-telao-ctrl" className="m-0 flex items-center gap-2.5 text-[15px] font-extrabold lg:text-[17px]">
          <Monitor size={20} aria-hidden="true" className="shrink-0 text-link" />
          Controle remoto do telão
        </h2>
        {highlight && onOpenTelao && (
          <button type="button" onClick={() => onOpenTelao(highlight)} className="min-h-11 text-[14px] font-bold text-link">Abrir telão</button>
        )}
      </div>
      <p className="m-0 mb-3.5 text-[13px] text-text-3">Troque o que passa no palco. Todos os monitores mudam juntos.</p>

      <div role="group" aria-label="Modo do telão" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGE_MODES.map((m) => {
          const ui = MODE_UI[m.id] || { icon: Monitor, color: 'var(--link)', label: m.label, desc: m.desc };
          const Icon = ui.icon;
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(m.id)}
              className={`press relative rounded-[14px] border-[1.5px] p-4 text-left text-text ${on ? 'border-action bg-surface-selected' : 'border-transparent bg-[#10172F]'}`}
            >
              {on && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-ok">
                  <span aria-hidden="true" className="tw-live h-2 w-2 rounded-full bg-ok" /> No ar
                </span>
              )}
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${ui.color} 12%, transparent)` }}>
                <Icon size={20} aria-hidden="true" style={{ color: ui.color }} />
              </span>
              <span className="mt-3 block text-[14px] font-extrabold">{ui.label}</span>
              <span className="mt-1 block text-[12px] leading-[1.4] text-text-3">{ui.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
