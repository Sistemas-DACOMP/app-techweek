import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import SymplaRequirementModal from './SymplaRequirementModal';

/**
 * Banner fixo superior focado em proposta de valor e conversão (DESIGN.md §5).
 * Convida ao upgrade do Passaporte Completo.
 */
export default function SymplaStickyBanner() {
  const { hasSymplaTicket, profile } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Não exibe se o usuário não estiver logado ou já tiver ingresso
  if (!profile || hasSymplaTicket) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label="Desbloqueie o Passaporte Completo"
        className="sticky top-0 z-[900] flex w-full cursor-pointer items-center gap-3 border-0 border-b border-solid border-amber-500/30 bg-[linear-gradient(90deg,#2E2105,#1A1405)] px-4 py-2.5 text-left font-sans text-text transition-colors hover:bg-[linear-gradient(90deg,#3B2B07,#241B07)]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-gold">
          <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold text-gold sm:text-sm">
            Desbloqueie o Passaporte Completo
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#E7E2CF] sm:text-xs">
            Acesse workshops exclusivos e ranking
          </span>
        </span>
        <span className="flex h-[32px] shrink-0 items-center rounded-full bg-[linear-gradient(135deg,#F59E0B,#D97706)] px-3 text-xs font-extrabold text-[#1F1603] shadow-[0_2px_8px_rgba(217,119,6,0.35)]">
          Desbloquear
        </span>
      </button>

      <SymplaRequirementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
