import { useState, useCallback } from 'react';
import { Tag, Plus, Check } from 'lucide-react';

export const TAG_GROUPS = [
  {
    category: 'Momento & Carreira',
    color: '#8FA0FF',
    tags: ['Estágio 2026', 'Júnior', 'Pleno', 'Iniciação Científica']
  },
  {
    category: 'Especialidade & Stack',
    color: '#C084FC',
    tags: ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'Dados & IA', 'DevOps & Cloud', 'Design / UI', 'Cybersec']
  },
  {
    category: 'Operação do Estande',
    color: '#FBBF24',
    tags: ['🎁 Brinde Entregue', '⭐ Destaque Técnico', '📅 Agendou Entrevista', '🚀 Desafio Enviado']
  }
];

export const ALL_PRESET_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

/**
 * Componente modular de Quick Tags para CRM de Estande TechWeek.
 * Permite seleção e alternância rápida de etiquetas com 1 toque.
 */
export default function SponsorQuickTags({
  selectedTags = [],
  onToggleTag,
  readOnly = false,
  compact = false,
  className = ''
}) {
  const [customTagInput, setCustomTagInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const isSelected = useCallback(
    (tag) => selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase()),
    [selectedTags]
  );

  const handleAddCustom = (e) => {
    e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && onToggleTag) {
      onToggleTag(clean);
      setCustomTagInput('');
      setIsAddingCustom(false);
    }
  };

  return (
    <div className={`sponsor-quick-tags flex flex-col gap-3.5 ${className}`}>
      {TAG_GROUPS.map((group) => (
        <div key={group.category} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-3">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: group.color }}
              aria-hidden="true"
            />
            {group.category}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => {
              const active = isSelected(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !readOnly && onToggleTag && onToggleTag(tag)}
                  disabled={readOnly}
                  aria-pressed={active}
                  className={`press inline-flex items-center gap-1.5 rounded-xl border font-bold transition-all ${
                    compact
                      ? 'px-2.5 py-1 text-[11px]'
                      : 'min-h-[42px] px-3.5 py-2 text-[12px] sm:text-[13px]'
                  } ${
                    active
                      ? 'border-[#8FA0FF]/50 bg-surface-selected text-text shadow-[0_2px_10px_rgba(143,160,255,0.18)]'
                      : 'border-border/70 bg-surface-raised/70 text-text-2 hover:border-border hover:text-text'
                  } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {active && <Check size={13} className="shrink-0 text-link" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!readOnly && onToggleTag && (
        <div className="mt-1 flex items-center gap-2">
          {isAddingCustom ? (
            <form onSubmit={handleAddCustom} className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Ex: Rust, Liderança..."
                maxLength={25}
                autoFocus
                className="h-9 rounded-xl border border-field-line bg-field px-3 text-[12px] text-text placeholder-text-4 focus:border-link focus:outline-none"
              />
              <button
                type="submit"
                className="h-9 rounded-xl bg-action px-3 text-[12px] font-bold text-white hover:brightness-110"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomTagInput('');
                  setIsAddingCustom(false);
                }}
                className="h-9 px-2 text-[12px] font-bold text-text-3 hover:text-text"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-link hover:underline"
            >
              <Plus size={14} />
              <span>Criar tag personalizada</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

