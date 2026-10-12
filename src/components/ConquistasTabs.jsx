import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'missions', label: 'Missões', to: '/challenges' },
  { id: 'ranking', label: 'Ranking', to: '/ranking' },
  { id: 'passport', label: 'Passaporte', to: '/challenges?tab=passport' },
];

/**
 * Cabeçalho de Conquistas (DESIGN.md §5): título centralizado + abas Missões · Ranking · Passaporte.
 * Missões e Passaporte são abas internas de /challenges (via ?tab=); Ranking é /ranking.
 */
export default function ConquistasTabs({ active }) {
  const navigate = useNavigate();
  return (
    <header className="pt-[18px]">
      <h1 className="screen-title mb-0! text-[22px]!">Conquistas</h1>
      <div role="tablist" aria-label="Conquistas" className="ds-tabs mt-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className="ds-tab"
            onClick={() => active !== t.id && navigate(t.to, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
