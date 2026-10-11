import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  X,
  Check,
  RotateCcw,
  Smartphone,
  CheckCheck,
  Save,
  Pencil,
  Briefcase,
  Calendar,
  Code2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  getSponsorSettings,
  saveSponsorSettings,
  resetTagsToDefault,
  interpolateTemplate,
  DEFAULT_QUALIFICATION_TAGS,
  DEFAULT_WHATSAPP_TEMPLATES,
} from '../../lib/sponsorSettingsService';
import { btn } from '../../pages/admin/ui';

const SAMPLE_CANDIDATES = [
  {
    name: 'Gabriel Santos',
    course: 'Engenharia de Software',
    phone: '34991234567',
  },
  {
    name: 'Larissa Souza',
    course: 'Ciência da Computação',
    phone: '34998765432',
  },
  {
    name: 'Lucas Lima',
    course: 'Sistemas de Informação',
    phone: '34988776655',
  },
];

const TEMPLATE_ICONS = {
  recruiter_outreach: Briefcase,
  interview_invite: Calendar,
  tech_challenge: Code2,
  stand_material: FileText,
};

export default function SponsorSettings({
  companyId = 'kanastra',
  companyName = 'Kanastra',
  onSettingsSaved,
}) {
  // Configurações persistidas
  const [settings, setSettings] = useState(() => getSponsorSettings(companyId));

  // Estado de Edição de Templates de WhatsApp
  const [selectedTemplateId, setSelectedTemplateId] = useState('recruiter_outreach');
  const [templateText, setTemplateText] = useState('');
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);
  const textareaRef = useRef(null);

  // Amostra ativa para Live Preview do WhatsApp
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);

  // Estado de Gerenciamento de Tags
  const [activeTags, setActiveTags] = useState(() => settings.tags || [...DEFAULT_QUALIFICATION_TAGS]);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [tagError, setTagError] = useState('');

  // Toast e Feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Sincroniza estado inicial ao montar ou trocar companyId
  useEffect(() => {
    const loaded = getSponsorSettings(companyId);
    setSettings(loaded);
    setActiveTags(loaded.tags);
    const activeTpl =
      loaded.templates.find((t) => t.id === loaded.activeTemplateId) ||
      loaded.templates[0] ||
      DEFAULT_WHATSAPP_TEMPLATES[0];
    setSelectedTemplateId(activeTpl.id);
    setTemplateText(activeTpl.text);
    setIsTemplateDirty(false);
  }, [companyId]);

  // Ao trocar de aba de template
  const handleSelectTemplate = (templateId) => {
    const tpl = settings.templates.find((t) => t.id === templateId) || DEFAULT_WHATSAPP_TEMPLATES[0];
    setSelectedTemplateId(templateId);
    setTemplateText(tpl.text);
    setIsTemplateDirty(false);
  };

  // Insere variável na posição do cursor do textarea
  const handleInsertVariable = (variableTag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateText((prev) => `${prev} ${variableTag}`);
      setIsTemplateDirty(true);
      return;
    }

    const start = textarea.selectionStart ?? templateText.length;
    const end = textarea.selectionEnd ?? templateText.length;
    const before = templateText.substring(0, start);
    const after = templateText.substring(end);

    const nextText = `${before}${variableTag}${after}`;
    setTemplateText(nextText);
    setIsTemplateDirty(true);

    // Restaura o foco com cursor após a variável inserida
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variableTag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Salva alterações do template atual
  const handleSaveTemplate = () => {
    const updatedTemplates = settings.templates.map((t) => {
      if (t.id === selectedTemplateId) {
        return { ...t, text: templateText.trim() };
      }
      return t;
    });

    const updated = saveSponsorSettings(companyId, {
      ...settings,
      templates: updatedTemplates,
    });

    setSettings(updated);
    setIsTemplateDirty(false);
    showToast('Modelo de WhatsApp atualizado com sucesso!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  // Define o template atual como padrão para contato rápido
  const handleSetAsDefaultTemplate = (templateId) => {
    const updated = saveSponsorSettings(companyId, {
      ...settings,
      activeTemplateId: templateId,
    });
    setSettings(updated);
    showToast('Modelo definido como padrão!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  // Restaura template selecionado para o texto padrão
  const handleResetCurrentTemplate = () => {
    const defaultTpl = DEFAULT_WHATSAPP_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!defaultTpl) return;

    setTemplateText(defaultTpl.text);
    const updatedTemplates = settings.templates.map((t) => {
      if (t.id === selectedTemplateId) {
        return { ...t, text: defaultTpl.text };
      }
      return t;
    });

    const updated = saveSponsorSettings(companyId, {
      ...settings,
      templates: updatedTemplates,
    });

    setSettings(updated);
    setIsTemplateDirty(false);
    showToast('Texto restaurado para o padrão original.', 'info');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  // -------------------------------------------------------------
  // GESTÃO DE TAGS DE QUALIFICAÇÃO
  // -------------------------------------------------------------

  const handleAddTag = (e) => {
    e?.preventDefault();
    setTagError('');
    const clean = newTagInput.trim();
    if (!clean) return;

    if (activeTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagError('Esta tag já existe na lista.');
      return;
    }

    if (clean.length > 30) {
      setTagError('O nome da tag deve ter até 30 caracteres.');
      return;
    }

    const nextTags = [...activeTags, clean];
    setActiveTags(nextTags);
    setNewTagInput('');

    const updated = saveSponsorSettings(companyId, {
      ...settings,
      tags: nextTags,
    });
    setSettings(updated);
    showToast(`Tag "${clean}" adicionada!`, 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  const handleRemoveTag = (tagToRemove) => {
    const nextTags = activeTags.filter((t) => t !== tagToRemove);
    setActiveTags(nextTags);

    const updated = saveSponsorSettings(companyId, {
      ...settings,
      tags: nextTags,
    });
    setSettings(updated);
    showToast(`Tag "${tagToRemove}" removida.`, 'info');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  const handleStartEditTag = (index, currentVal) => {
    setEditingTagIndex(index);
    setEditingTagValue(currentVal);
  };

  const handleSaveEditTag = (index) => {
    const clean = editingTagValue.trim();
    if (!clean) {
      setEditingTagIndex(null);
      return;
    }

    const nextTags = [...activeTags];
    nextTags[index] = clean;
    setActiveTags(nextTags);
    setEditingTagIndex(null);

    const updated = saveSponsorSettings(companyId, {
      ...settings,
      tags: nextTags,
    });
    setSettings(updated);
    showToast('Tag renomeada com sucesso!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  const handleResetTags = () => {
    const updated = resetTagsToDefault(companyId);
    setSettings(updated);
    setActiveTags(updated.tags);
    showToast('Tags de qualificação restauradas para as 8 tags padrão!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  // Preview interpolado dinâmico
  const activeSample = SAMPLE_CANDIDATES[selectedSampleIndex] || SAMPLE_CANDIDATES[0];
  const interpolatedPreview = useMemo(() => {
    return interpolateTemplate(templateText, {
      name: activeSample.name,
      companyName,
      course: activeSample.course,
    });
  }, [templateText, activeSample, companyName]);

  const isCurrentActiveOutreach = settings.activeTemplateId === selectedTemplateId;

  return (
    <div className="sponsor-settings flex flex-col gap-6 animate-fade-in pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-surface-selected border border-ok px-4 py-3 text-[13px] font-bold text-text shadow-2xl animate-fade-in"
        >
          <Check size={16} className="text-ok shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Limpo e Direto da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold text-text tracking-tight m-0">
            Personalização do Estande
          </h1>
          <p className="text-[13px] text-text-3 mt-1 m-0">
            Modelos de mensagem do WhatsApp e tags de qualificação para a equipe {companyName}.
          </p>
        </div>
      </div>

      {/* GRID PRINCIPAL: BLOCO A (WHATSAPP) & BLOCO B (TAGS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* BLOCO A: MODELOS DE WHATSAPP (7 Colunas no Desktop XL)                    */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="section-whatsapp-title"
          className="xl:col-span-7 flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h2 id="section-whatsapp-title" className="text-[16px] font-extrabold text-text m-0">
                Modelos de WhatsApp
              </h2>
              <p className="text-[12px] text-text-3 mt-0.5 m-0">
                Textos pré-formatados para contato ágil com candidatos no CRM e leitor.
              </p>
            </div>

            {/* Status ou Ação do Modelo Selecionado */}
            <div>
              {isCurrentActiveOutreach ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 border border-ok/30 px-3 py-1 text-[11px] font-bold text-ok shrink-0">
                  <Check size={12} strokeWidth={2.5} />
                  <span>Modelo Padrão</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetAsDefaultTemplate(selectedTemplateId)}
                  className={btn('secondary', 'min-h-[44px] px-3.5 text-[12px] shrink-0')}
                  title="Definir este modelo como padrão de disparo"
                >
                  <span>Definir como padrão</span>
                </button>
              )}
            </div>
          </div>

          {/* Seletor de Modelos de Mensagem */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {settings.templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              const isDefault = tpl.id === settings.activeTemplateId;
              const IconComp = TEMPLATE_ICONS[tpl.id] || MessageSquare;
              const displayTitle = tpl.title.replace(/\s*\(Padrão\)/i, '');

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id)}
                  aria-pressed={isSelected}
                  title={displayTitle}
                  className={`press group relative flex flex-col justify-between items-start gap-1.5 rounded-xl p-3 text-left transition-all border min-h-[64px] ${
                    isSelected
                      ? 'bg-surface-selected border-link text-text shadow-sm ring-1 ring-link/40'
                      : 'bg-surface-raised border-line text-text-2 hover:bg-surface-raised/80 hover:text-text'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <IconComp
                      size={15}
                      className={`shrink-0 ${isSelected ? 'text-link' : 'text-text-3 group-hover:text-text'}`}
                    />
                    {isDefault && (
                      <span
                        className="inline-flex items-center rounded-md bg-link/15 border border-link/30 px-1.5 py-0.5 text-[9px] font-bold text-link shrink-0 uppercase tracking-wide"
                        title="Modelo padrão configurado"
                      >
                        Padrão
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-bold line-clamp-2 leading-snug">{displayTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Chips de Inserção de Variáveis Dinâmicas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-text-3">
              <span>Inserir variável no texto</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleInsertVariable('{nome}')}
                className="press inline-flex items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-[12px] font-medium text-text-2 hover:text-text hover:bg-surface-selected transition-colors"
                title="Insere o primeiro nome do participante"
              >
                <Plus size={12} className="text-link" />
                <span className="font-mono text-link">&#123;nome&#125;</span>
                <span className="text-[11px] text-text-4">Primeiro nome</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertVariable('{empresa}')}
                className="press inline-flex items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-[12px] font-medium text-text-2 hover:text-text hover:bg-surface-selected transition-colors"
                title="Insere o nome da sua empresa"
              >
                <Plus size={12} className="text-link" />
                <span className="font-mono text-link">&#123;empresa&#125;</span>
                <span className="text-[11px] text-text-4">Empresa</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertVariable('{curso}')}
                className="press inline-flex items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 py-1 text-[12px] font-medium text-text-2 hover:text-text hover:bg-surface-selected transition-colors"
                title="Insere o curso do aluno"
              >
                <Plus size={12} className="text-link" />
                <span className="font-mono text-link">&#123;curso&#125;</span>
                <span className="text-[11px] text-text-4">Curso</span>
              </button>
            </div>
          </div>

          {/* Campo Textarea do Modelo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-text-3">
              <label htmlFor="template-text-editor">Texto do Modelo</label>
              <span className="text-[11px] font-semibold text-text-4 font-mono">
                {templateText.length} caracteres
              </span>
            </div>

            <textarea
              id="template-text-editor"
              ref={textareaRef}
              rows={4}
              value={templateText}
              onChange={(e) => {
                setTemplateText(e.target.value);
                setIsTemplateDirty(true);
              }}
              placeholder="Digite o modelo de mensagem..."
              className="w-full resize-y rounded-xl border border-field-line bg-field p-3 text-[13px] leading-relaxed text-text placeholder-text-4 focus:border-link focus:outline-none focus:ring-1 focus:ring-link font-sans shadow-inner"
            />
          </div>

          {/* Ações do Modelo */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResetCurrentTemplate}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-[12px] font-semibold text-text-3 hover:text-text hover:border-line-2 transition-colors min-h-[44px]"
            >
              <RotateCcw size={13} />
              <span>Restaurar texto original</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!isTemplateDirty}
              className={btn(
                isTemplateDirty ? 'action' : 'secondary',
                `min-h-[44px] px-4 text-[13px] ${!isTemplateDirty ? 'opacity-50 cursor-not-allowed' : ''}`
              )}
            >
              <Save size={14} />
              <span>Salvar alterações</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SIMULADOR / LIVE PREVIEW DE WHATSAPP COMPACTO                            */}
          {/* ========================================================================= */}
          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-line bg-surface-raised/40 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Smartphone size={14} className="text-text-3" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-3">
                  Pré-visualização (WhatsApp)
                </span>
              </div>

              {/* Seletor de Candidato Exemplo */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-4">Exemplo:</span>
                <select
                  value={selectedSampleIndex}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  className="rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-text focus:border-link focus:outline-none"
                  aria-label="Selecionar candidato de teste"
                >
                  {SAMPLE_CANDIDATES.map((cand, idx) => (
                    <option key={cand.name} value={idx}>
                      {cand.name} ({cand.course})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Balão Autêntico e Compacto de WhatsApp */}
            <div className="rounded-xl p-3 bg-[#0B141A] border border-[#202C33]">
              <div className="flex items-center gap-2 pb-2 border-b border-[#202C33]/60 mb-2.5">
                <div className="size-6 rounded-full bg-[#1F2C34] flex items-center justify-center font-bold text-[10px] text-[#00A884]">
                  {activeSample.name.charAt(0)}
                </div>
                <div className="text-[12px] font-bold text-[#E9EDEF] truncate">
                  {activeSample.name}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="relative max-w-[92%] rounded-xl rounded-tr-none p-2.5 text-[12px] leading-relaxed bg-[#005C4B] text-[#E9EDEF]">
                  <p className="whitespace-pre-wrap m-0 break-words">{interpolatedPreview}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696A0]">
                    <span>14:32</span>
                    <CheckCheck size={12} className="text-[#53BDEB]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BLOCO B: TAGS DE QUALIFICAÇÃO DO ESTANDE (5 Colunas no Desktop XL)        */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="section-tags-title"
          className="xl:col-span-5 flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <h2 id="section-tags-title" className="text-[16px] font-extrabold text-text m-0">
                Tags de Qualificação
              </h2>
              <p className="text-[12px] text-text-3 mt-0.5 m-0">
                Marcadores usados para avaliar candidatos durante o atendimento.
              </p>
            </div>

            <span className="self-start sm:self-auto rounded-full bg-surface-raised border border-line px-2.5 py-0.5 text-[11px] font-bold text-text-3">
              {activeTags.length} {activeTags.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>

          {/* Formulário de Adição de Nova Tag */}
          <form onSubmit={handleAddTag} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => {
                  setNewTagInput(e.target.value);
                  if (tagError) setTagError('');
                }}
                placeholder="Nova tag (ex: IA, Frontend)..."
                className="flex-1 rounded-xl border border-field-line bg-field px-3.5 py-2.5 text-[13px] text-text placeholder-text-4 focus:border-link focus:outline-none min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className={btn('action', 'min-h-[44px] px-4 text-[13px] shrink-0 disabled:opacity-50')}
              >
                <Plus size={15} />
                <span>Adicionar</span>
              </button>
            </div>
            {tagError && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-warn">
                <AlertCircle size={12} /> {tagError}
              </span>
            )}
          </form>

          {/* Lista de Tags Ativas com Chips Interativos */}
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-line bg-surface-raised/30 min-h-[100px] items-start content-start">
            {activeTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-4 text-center text-text-4 text-[12px]">
                <span>Nenhuma tag cadastrada.</span>
                <button
                  type="button"
                  onClick={handleResetTags}
                  className="mt-1.5 text-link hover:underline font-bold"
                >
                  Restaurar tags padrão
                </button>
              </div>
            ) : (
              activeTags.map((tag, index) => {
                const isEditingThis = editingTagIndex === index;

                if (isEditingThis) {
                  return (
                    <div
                      key={`edit-${index}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-link bg-surface px-2 py-1 shadow-sm"
                    >
                      <input
                        type="text"
                        value={editingTagValue}
                        onChange={(e) => setEditingTagValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditTag(index);
                          if (e.key === 'Escape') setEditingTagIndex(null);
                        }}
                        autoFocus
                        className="w-24 bg-transparent text-[12px] font-bold text-text focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditTag(index)}
                        className="press p-0.5 text-ok hover:bg-ok/10 rounded"
                        title="Salvar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTagIndex(null)}
                        className="press p-0.5 text-text-3 hover:bg-surface-raised rounded"
                        title="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                }

                return (
                  <span
                    key={tag}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface-raised px-2.5 py-1 text-[12px] font-semibold text-text hover:border-link/50 transition-colors"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleStartEditTag(index, tag)}
                      className="opacity-50 hover:opacity-100 p-0.5 text-text-3 hover:text-text transition-opacity"
                      aria-label={`Editar tag ${tag}`}
                      title="Editar tag"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="opacity-50 hover:opacity-100 p-0.5 text-text-3 hover:text-warn transition-opacity"
                      aria-label={`Remover tag ${tag}`}
                      title={`Remover ${tag}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Restaurar Tags Padrão */}
          <div className="pt-2 border-t border-line flex items-center justify-end">
            <button
              type="button"
              onClick={handleResetTags}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-[12px] font-medium text-text-3 hover:text-text transition-colors min-h-[44px]"
            >
              <RotateCcw size={13} />
              <span>Restaurar tags padrão</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
