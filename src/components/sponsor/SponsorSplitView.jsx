import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Star, 
  GraduationCap, 
  Mail, 
  Phone, 
  ExternalLink, 
  Copy, 
  Check, 
  Save, 
  Loader2, 
  Filter,
  Sparkles,
  User,
  Clock,
  ChevronRight
} from 'lucide-react';
import { GitHubIcon } from '../ParticipantCard';
import SponsorQuickTags from './SponsorQuickTags';
import SponsorWhatsAppHub from './SponsorWhatsAppHub';
import { getAffiliationBadge, RATING_CLASSIFICATIONS } from '../SponsorLeadModal';

const AVATAR_BG = ['#2A3570', '#4C2A85', '#1E5A6B', '#7A3A22', '#2C5E3F', '#6B2D5C'];
const bgFor = (s = '') => AVATAR_BG[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length];
const initialsOf = (n = '') => n.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';

/**
 * Split-View (Master-Detail) Desktop & Tablet OS para o Estande.
 * Permite navegação ultrarrápida entre candidatos sem modals sobrepostos.
 */
export default function SponsorSplitView({
  leads = [],
  selectedLead = null,
  onSelectLead,
  onUpdateLead,
  companyName = 'Patrocinador',
  isLoading = false
}) {
  const [activeLeadId, setActiveLeadId] = useState(selectedLead?.participantUid || (leads[0]?.participantUid ?? null));
  const [searchTerm, setSearchTerm] = useState('');
  const [starFilter, setStarFilter] = useState('all'); // 'all' | '5' | '4' | '3' | 'rated'
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Lead Dossier Local State
  const [currentRating, setCurrentRating] = useState(0);
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentTags, setCurrentTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty'
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Find currently active lead
  const activeLead = useMemo(() => {
    return leads.find((l) => l.participantUid === activeLeadId) || leads[0] || null;
  }, [leads, activeLeadId]);

  // Sync active lead into local dossier form
  useEffect(() => {
    if (activeLead) {
      setCurrentRating(Number(activeLead.rating) || 0);
      setCurrentNotes(activeLead.notes || '');
      setCurrentTags(Array.isArray(activeLead.tags) ? activeLead.tags : []);
      setSaveStatus('saved');
    }
  }, [activeLead?.participantUid]);

  // Notify parent if selection changes
  const handleSelect = (lead) => {
    setActiveLeadId(lead.participantUid);
    if (onSelectLead) onSelectLead(lead);
  };

  // Collect all unique tags in leads for filter
  const availableTags = useMemo(() => {
    const set = new Set();
    leads.forEach((l) => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach((t) => set.add(t));
      }
    });
    return Array.from(set);
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((l) => {
        return (
          l.name?.toLowerCase().includes(q) ||
          l.course?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q) ||
          (Array.isArray(l.tags) && l.tags.some((t) => t.toLowerCase().includes(q)))
        );
      });
    }

    if (starFilter === '5') {
      result = result.filter((l) => Number(l.rating) === 5);
    } else if (starFilter === '4') {
      result = result.filter((l) => Number(l.rating) >= 4);
    } else if (starFilter === '3') {
      result = result.filter((l) => Number(l.rating) >= 3);
    } else if (starFilter === 'rated') {
      result = result.filter((l) => Number(l.rating) > 0);
    }

    if (selectedTagFilter !== 'all') {
      result = result.filter((l) => Array.isArray(l.tags) && l.tags.includes(selectedTagFilter));
    }

    return result;
  }, [leads, searchTerm, starFilter, selectedTagFilter]);

  // Auto-save debounced or instant update
  const triggerSave = useCallback(
    async (newRating, newNotes, newTags) => {
      if (!activeLead || !onUpdateLead) return;
      setIsSaving(true);
      setSaveStatus('saving');
      try {
        await onUpdateLead({
          participantUid: activeLead.participantUid,
          rating: newRating,
          notes: newNotes,
          tags: newTags
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Erro ao salvar lead no Split-View:', err);
        setSaveStatus('dirty');
      } finally {
        setIsSaving(false);
      }
    },
    [activeLead, onUpdateLead]
  );

  const handleRatingChange = (stars) => {
    const next = currentRating === stars ? 0 : stars;
    setCurrentRating(next);
    triggerSave(next, currentNotes, currentTags);
  };

  const handleToggleTag = (tag) => {
    const exists = currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());
    const nextTags = exists
      ? currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
      : [...currentTags, tag];
    setCurrentTags(nextTags);
    triggerSave(currentRating, currentNotes, nextTags);
  };

  const handleNotesChange = (e) => {
    setCurrentNotes(e.target.value);
    setSaveStatus('dirty');
  };

  const handleSaveNotes = () => {
    triggerSave(currentRating, currentNotes, currentTags);
  };

  const handleCopyEmail = () => {
    if (activeLead?.email && navigator?.clipboard) {
      navigator.clipboard.writeText(activeLead.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const affiliation = activeLead ? getAffiliationBadge(activeLead) : null;
  const ratingInfo = RATING_CLASSIFICATIONS[currentRating] || RATING_CLASSIFICATIONS[0];

  return (
    <div className="sponsor-split-view grid grid-cols-12 gap-5 rounded-3xl border border-border bg-surface/50 p-4 lg:p-6">
      {/* Coluna Esquerda: Master List (5 cols on lg) */}
      <div className="col-span-12 flex flex-col gap-4 lg:col-span-5 border-b border-border pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
        {/* Search & Header */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-text">Candidatos no Estande</span>
            <span className="rounded-full bg-surface-selected px-2.5 py-0.5 text-[11px] font-bold text-link">
              {filteredLeads.length} de {leads.length}
            </span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, curso, tag..."
              className="h-10 w-full rounded-xl border border-field-line bg-field pl-9 pr-3 text-[13px] text-text placeholder-text-4 focus:border-link focus:outline-none"
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Todos' },
            { id: '5', label: '5 ★' },
            { id: '4', label: '4★+' },
            { id: 'rated', label: 'Avaliados' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStarFilter(f.id)}
              className={`press rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                starFilter === f.id
                  ? 'bg-text text-bg'
                  : 'border border-border/80 bg-surface-raised/60 text-text-3 hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}

          {availableTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="h-7 rounded-lg border border-border/80 bg-surface-raised px-2 text-[11px] font-bold text-text-3 focus:outline-none"
            >
              <option value="all">Todas as Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Scrollable Master List */}
        <div className="flex max-h-[640px] flex-col gap-2 overflow-y-auto pr-1">
          {filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-text-3">
              Nenhum candidato encontrado com os filtros atuais.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isCurrent = lead.participantUid === activeLeadId;
              const leadRating = Number(lead.rating) || 0;
              const aff = getAffiliationBadge(lead);

              return (
                <button
                  key={lead.participantUid}
                  type="button"
                  onClick={() => handleSelect(lead)}
                  className={`press flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                    isCurrent
                      ? 'border-[#8FA0FF]/60 bg-surface-selected shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                      : 'border-border/60 bg-surface hover:border-border hover:bg-surface-raised/60'
                  }`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white shadow-inner"
                    style={{ background: bgFor(lead.name) }}
                  >
                    {initialsOf(lead.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[13px] font-bold text-text">
                        {lead.name}
                      </span>
                      {leadRating > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] font-black text-[#FBBF24]">
                          <Star size={11} fill="#FBBF24" />
                          {leadRating}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-3">
                      <span className="truncate">{lead.course || 'Computação'}</span>
                      {lead.period && <span>• {lead.period}º P</span>}
                    </div>

                    {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {lead.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-border/60 bg-surface-raised px-1.5 py-0.5 text-[9px] font-semibold text-text-3"
                          >
                            {t}
                          </span>
                        ))}
                        {lead.tags.length > 3 && (
                          <span className="text-[9px] font-bold text-text-4">
                            +{lead.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Coluna Direita: Detail Dossier (7 cols on lg) */}
      <div className="col-span-12 flex flex-col gap-4 lg:col-span-7">
        {!activeLead ? (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-text-3">
            <User size={48} className="mb-3 opacity-30" />
            <div className="text-[15px] font-bold">Nenhum candidato selecionado</div>
            <p className="mt-1 text-[13px] text-text-4">
              Clique em um perfil à esquerda para visualizar o dossiê completo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Header do Dossiê */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md"
                    style={{ background: bgFor(activeLead.name) }}
                  >
                    {initialsOf(activeLead.name)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="m-0 text-[18px] font-extrabold text-text">{activeLead.name}</h3>
                      {affiliation && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
                          style={{
                            color: affiliation.color,
                            background: affiliation.bg,
                            border: `1px solid ${affiliation.border}`
                          }}
                        >
                          {affiliation.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-text-2">
                      <span>{activeLead.course || 'Computação'}</span>
                      {activeLead.period && <span>• {activeLead.period}º Período</span>}
                      {activeLead.faixaEtaria && activeLead.faixaEtaria !== 'Não informada' && (
                        <span>• {activeLead.faixaEtaria}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-xl px-2.5 py-1 text-[11px] font-extrabold"
                    style={{
                      color: ratingInfo.color,
                      background: ratingInfo.bg,
                      border: `1px solid ${ratingInfo.border}`
                    }}
                  >
                    {ratingInfo.label}
                  </span>
                </div>
              </div>

              {/* Star Rating Widget */}
              <div className="mt-1 flex items-center justify-between rounded-xl border border-border/80 bg-surface-raised/40 p-3">
                <div className="text-[12px] font-bold text-text-2">Avaliação Técnica:</div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(star)}
                      className="press p-1 hover:scale-110"
                      title={`${star} estrelas`}
                    >
                      <Star
                        size={22}
                        className={
                          star <= currentRating
                            ? 'fill-[#FBBF24] text-[#FBBF24]'
                            : 'text-text-4 hover:text-text-3'
                        }
                      />
                    </button>
                  ))}
                  {currentRating > 0 && (
                    <span className="ml-2 text-[13px] font-black text-[#FBBF24]">
                      {currentRating}.0
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Links Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {activeLead.email && (
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-text-2 hover:text-text"
                  >
                    {copiedEmail ? <Check size={13} className="text-[#6FD8A6]" /> : <Mail size={13} />}
                    <span className="truncate max-w-[160px]">{activeLead.email}</span>
                  </button>
                )}

                {activeLead.github && (
                  <a
                    href={`https://github.com/${activeLead.github.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-text-2 hover:text-text"
                  >
                    <GitHubIcon size={13} color="currentColor" />
                    <span>@{activeLead.github.replace(/^@/, '')}</span>
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}

                {activeLead.linkedin && (
                  <a
                    href={
                      activeLead.linkedin.startsWith('http')
                        ? activeLead.linkedin
                        : `https://linkedin.com/in/${activeLead.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-text-2 hover:text-text"
                  >
                    <span>LinkedIn</span>
                    <ExternalLink size={11} className="opacity-60" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Tags Section */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 text-[13px] font-extrabold text-text">Tags & Habilidades</div>
              <SponsorQuickTags
                selectedTags={currentTags}
                onToggleTag={handleToggleTag}
                compact
              />
            </div>

            {/* Notes Section with Auto-Save */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-text">Notas do Recrutador</span>
                <span className="text-[11px] font-semibold text-text-3">
                  {saveStatus === 'saving' ? (
                    <span className="flex items-center gap-1 text-link">
                      <Loader2 size={12} className="animate-spin" /> Salvando...
                    </span>
                  ) : saveStatus === 'saved' ? (
                    <span className="text-[#6FD8A6]">Salvo ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="inline-flex items-center gap-1 text-link hover:underline font-bold"
                    >
                      <Save size={12} /> Salvar alterações
                    </button>
                  )}
                </span>
              </div>
              <textarea
                rows={3}
                value={currentNotes}
                onChange={handleNotesChange}
                onBlur={handleSaveNotes}
                placeholder="Observações da conversa no estande, fit com a vaga, projetos de destaque..."
                className="w-full resize-none rounded-xl border border-field-line bg-field p-3 text-[12px] text-text placeholder-text-4 focus:border-link focus:outline-none"
              />
            </div>

            {/* WhatsApp Outreach Hub */}
            <SponsorWhatsAppHub
              phone={activeLead.phone}
              participantName={activeLead.name}
              companyName={companyName}
            />
          </div>
        )}
      </div>
    </div>
  );
}

