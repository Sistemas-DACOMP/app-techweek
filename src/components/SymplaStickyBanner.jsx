import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import SymplaRequirementModal from './SymplaRequirementModal';

/**
 * Bloco dourado fixo no topo das telas para quem ainda não vinculou o ingresso (DESIGN.md §5).
 * Sem animação (§9 "Não animar"). Abre o sheet "Vincule seu ingresso".
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
        className="sticky top-0 z-[900] flex w-full cursor-pointer items-center gap-3 border-0 border-b border-solid border-[rgba(242,196,106,0.5)] bg-[linear-gradient(90deg,#3B2B07,#241B07)] px-4 py-3 text-left font-sans text-text"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(242,196,106,0.2)]">
          <Ticket size={18} strokeWidth={2} className="text-warn" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-warn">Ingresso não vinculado</span>
          <span className="mt-px block text-xs leading-[1.35] text-[#E7E2CF]">Sem ele você não reserva vagas nem pontua.</span>
        </span>
        <span className="flex h-[34px] shrink-0 items-center rounded-[10px] bg-warn px-3.5 text-[13px] font-extrabold text-[#2A1F05]">
          Vincular
        </span>
      </button>

      <SymplaRequirementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
