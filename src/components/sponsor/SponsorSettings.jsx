import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Tag,
  Plus,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Smartphone,
  CheckCheck,
  Save,
  Pencil,
  Info,
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
import { WhatsAppIcon } from '../WhatsAppButton';
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

  // Define o template atual como padrão para o botão de 1-clique
  const handleSetAsDefaultTemplate = (templateId) => {
    const updated = saveSponsorSettings(companyId, {
      ...settings,
      activeTemplateId: templateId,
    });
    setSettings(updated);
    showToast('Modelo definido como padrão no botão de 1-clique!', 'success');
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

  const currentTemplateObj =
    settings.templates.find((t) => t.id === selectedTemplateId) || DEFAULT_WHATSAPP_TEMPLATES[0];

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

      {/* Header Informativo da Seção */}
      <div className="rounded-[22px] border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-link/10 border border-link/30 text-link">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-[19px] sm:text-[21px] font-black text-text tracking-tight m-0">
              Personalização do Estande
            </h1>
            <p className="text-[13px] text-text-2 mt-0.5 leading-relaxed">
              Configure as mensagens rápidas de WhatsApp e as tags de recrutamento da equipe{' '}
              <strong className="text-text">{companyName}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-text-3">
            <Sparkles size={13} className="text-link" />
            <span>Sincronizado em tempo real</span>
          </span>
        </div>
      </div>

      {/* GRID PRINCIPAL: BLOCO A (WHATSAPP) & BLOCO B (TAGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* BLOCO A: MENSAGENS DE CONTATO RÁPIDO WHATSAPP (7 Colunas no Desktop)     */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="section-whatsapp-title"
          className="lg:col-span-7 flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                  <WhatsAppIcon size={16} />
                </span>
                <h2 id="section-whatsapp-title" className="text-[16px] font-extrabold text-text m-0">
                  Mensagens de Contato Rápido (1-Clique)
                </h2>
              </div>
              <p className="text-[12px] text-text-3 mt-1 m-0">
                Personalize o que é enviado ao clicar em "Conversar no WhatsApp" no perfil do lead.
              </p>
            </div>

            {/* Toggle de Template Ativo como Padrão de 1-Clique */}
            {isCurrentActiveOutreach ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 px-2.5 py-1 text-[11px] font-extrabold text-[#25D366]">
                <Check size={13} />
                <span>Padrão no 1-Clique</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSetAsDefaultTemplate(selectedTemplateId)}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1 text-[11px] font-bold text-text-2 hover:text-text hover:border-link/50 transition-colors"
                title="Tornar esta mensagem o padrão principal de abordagem"
              >
                <span>Usar como Padrão 1-Clique</span>
              </button>
            )}
          </div>

          {/* Abas de Modelos de Mensagem */}
          <div className="flex flex-wrap gap-2">
            {settings.templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              const isDefault = tpl.id === settings.activeTemplateId;
              const IconComp = TEMPLATE_ICONS[tpl.id] || MessageSquare;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id)}
                  aria-pressed={isSelected}
                  className={`press flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all border ${
                    isSelected
                      ? 'bg-surface-selected border-link text-text shadow-sm shadow-link/10'
                      : 'bg-surface-raised border-line text-text-2 hover:bg-surface-raised/80 hover:text-text'
                  }`}
                >
                  <IconComp size={14} className={isSelected ? 'text-link' : 'text-text-3'} />
                  <span>{tpl.title}</span>
                  {isDefault && (
                    <span
                      className="size-2 rounded-full bg-[#25D366]"
                      title="Modelo padrão de 1-clique"
                      aria-label="Padrão"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Descrição contextual do modelo selecionado */}
          <div className="flex items-center gap-2 rounded-xl bg-surface-raised/60 px-3 py-2 text-[12px] text-text-3 border border-line/60">
            <Info size={14} className="text-link shrink-0" />
            <span className="truncate">{currentTemplateObj.description}</span>
          </div>

          {/* Chips de Inserção de Variáveis Dinâmicas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-text-3">
              <span>Variáveis Disponíveis (Clique para Inserir)</span>
              <span className="text-[10px] text-text-4 font-normal lowercase">insere na posição do cursor</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleInsertVariable('{nome}')}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-link/40 bg-link/10 px-3 py-1.5 text-[12px] font-bold text-link hover:bg-link/20 transition-colors"
                title="Insere o primeiro nome do participante (ex: Gabriel)"
              >
                <Plus size={13} />
                <span>&#123;nome&#125;</span>
                <span className="text-[10px] text-text-3 font-normal opacity-80">(Primeiro nome)</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertVariable('{empresa}')}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-warn/40 bg-warn/10 px-3 py-1.5 text-[12px] font-bold text-warn hover:bg-warn/20 transition-colors"
                title="Insere o nome da sua empresa (ex: Kanastra)"
              >
                <Plus size={13} />
                <span>&#123;empresa&#125;</span>
                <span className="text-[10px] text-text-3 font-normal opacity-80">({companyName})</span>
              </button>

              <button
                type="button"
                onClick={() => handleInsertVariable('{curso}')}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/10 px-3 py-1.5 text-[12px] font-bold text-purple-300 hover:bg-purple-500/20 transition-colors"
                title="Insere o curso do aluno (ex: Engenharia de Software)"
              >
                <Plus size={13} />
                <span>&#123;curso&#125;</span>
                <span className="text-[10px] text-text-3 font-normal opacity-80">(Curso acadêmico)</span>
              </button>
            </div>
          </div>

          {/* Campo Textarea do Modelo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-text-3">
              <label htmlFor="template-text-editor">Texto da Mensagem</label>
              <span className="text-[11px] font-semibold text-text-4 font-mono">
                {templateText.length} caracteres
              </span>
            </div>

            <textarea
              id="template-text-editor"
              ref={textareaRef}
              rows={5}
              value={templateText}
              onChange={(e) => {
                setTemplateText(e.target.value);
                setIsTemplateDirty(true);
              }}
              placeholder="Digite o modelo de mensagem..."
              className="w-full resize-y rounded-2xl border border-field-line bg-field p-3.5 text-[13px] leading-relaxed text-text placeholder-text-4 focus:border-link focus:outline-none focus:ring-1 focus:ring-link font-sans shadow-inner"
            />
          </div>

          {/* Ações do Modelo */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResetCurrentTemplate}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-[12px] font-bold text-text-3 hover:text-text hover:border-line-2 transition-colors min-h-[40px]"
            >
              <RotateCcw size={14} />
              <span>Restaurar Texto Padrão</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!isTemplateDirty}
              className={`press inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold transition-all min-h-[42px] ${
                isTemplateDirty
                  ? 'bg-action text-white shadow-lg shadow-action/25 hover:bg-action-hover'
                  : 'bg-surface-raised text-text-4 border border-line cursor-not-allowed opacity-60'
              }`}
            >
              <Save size={15} />
              <span>Salvar Alterações</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SIMULADOR / LIVE PREVIEW DE WHATSAPP REALISTA                            */}
          {/* ========================================================================= */}
          <div className="mt-2 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={15} className="text-[#25D366]" />
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-text">
                  Pré-visualização em Tempo Real (WhatsApp)
                </span>
              </div>

              {/* Seletor de Candidato Exemplo */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-3 font-semibold hidden sm:inline">Exemplo:</span>
                <select
                  value={selectedSampleIndex}
                  onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-text focus:border-link focus:outline-none"
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

            {/* Balão Autêntico de WhatsApp */}
            <div
              className="rounded-xl p-4 overflow-hidden border border-[#202C33]"
              style={{
                backgroundColor: '#0B141A',
                backgroundImage:
                  'radial-gradient(#1B2730 1px, transparent 1px), radial-gradient(#1B2730 1px, #0B141A 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px',
              }}
            >
              {/* Header do Chat WhatsApp */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#202C33]/80 mb-3.5">
                <div className="size-8 rounded-full bg-[#1F2C34] flex items-center justify-center font-bold text-[12px] text-[#00A884]">
                  {activeSample.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[#E9EDEF] truncate">
                    {activeSample.name}
                  </div>
                  <div className="text-[10px] text-[#8696A0] flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-[#00A884]" />
                    <span>online</span>
                  </div>
                </div>
              </div>

              {/* Balão de Mensagem Enviada (Outgoing Bubble) */}
              <div className="flex justify-end">
                <div
                  className="relative max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-tr-xs p-3 text-[13px] leading-relaxed shadow-md"
                  style={{
                    backgroundColor: '#005C4B',
                    color: '#E9EDEF',
                  }}
                >
                  <p className="whitespace-pre-wrap m-0 break-words">{interpolatedPreview}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696A0]">
                    <span>14:32</span>
                    <CheckCheck size={13} className="text-[#53BDEB]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BLOCO B: TAGS DE QUALIFICAÇÃO DO ESTANDE (5 Colunas no Desktop)          */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="section-tags-title"
          className="lg:col-span-5 flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-link/15 text-link">
                  <Tag size={16} />
                </span>
                <h2 id="section-tags-title" className="text-[16px] font-extrabold text-text m-0">
                  Tags de Qualificação
                </h2>
              </div>
              <p className="text-[12px] text-text-3 mt-1 m-0">
                Chips usados pelos recrutadores no modal e no split-view para avaliar candidatos.
              </p>
            </div>

            <span className="self-start sm:self-auto rounded-full bg-surface-raised border border-line px-2.5 py-0.5 text-[11px] font-extrabold text-text-2">
              {activeTags.length} {activeTags.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>

          {/* Dica operacional */}
          <div className="rounded-xl border border-line/60 bg-surface-raised/40 p-3 text-[12px] text-text-3 leading-relaxed">
            Mantenha entre <strong>6 a 12 tags</strong> bem definidas para que os recrutadores no
            estande consigam classificar com agilidade em poucos toques durante conversas de pico.
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
                placeholder="Ex: Cybersec, Fullstack, IA..."
                className="flex-1 rounded-xl border border-field-line bg-field px-3.5 py-2.5 text-[13px] text-text placeholder-text-4 focus:border-link focus:outline-none min-h-[44px]"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className={btn(
                  'action',
                  'h-11 px-4 text-[13px] font-bold shrink-0 shadow-sm disabled:opacity-50'
                )}
              >
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            </div>
            {tagError && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-warn">
                <AlertCircle size={13} /> {tagError}
              </span>
            )}
          </form>

          {/* Lista de Tags Ativas com Chips Interativos */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-3">
              Tags Ativas no Estande ({activeTags.length})
            </span>

            <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-line bg-surface-raised/50 min-h-[110px] items-start content-start">
              {activeTags.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full py-6 text-center text-text-3 text-[12px]">
                  <span>Nenhuma tag cadastrada no momento.</span>
                  <button
                    type="button"
                    onClick={handleResetTags}
                    className="mt-2 text-link underline font-bold"
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
                        className="inline-flex items-center gap-1 rounded-xl border border-link bg-surface px-2 py-1 shadow-sm"
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
                          className="press p-1 text-ok hover:bg-ok/10 rounded"
                          title="Salvar"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTagIndex(null)}
                          className="press p-1 text-text-3 hover:bg-surface-raised rounded"
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
                      className="group inline-flex items-center gap-1.5 rounded-xl border border-link/30 bg-surface-selected/80 px-3 py-1.5 text-[12px] font-bold text-text transition-all hover:border-link/60 shadow-xs"
                    >
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => handleStartEditTag(index, tag)}
                        title="Clique para editar nome da tag"
                      >
                        {tag}
                      </span>

                      {/* Botão de Edição Rápida */}
                      <button
                        type="button"
                        onClick={() => handleStartEditTag(index, tag)}
                        className="opacity-60 hover:opacity-100 p-0.5 rounded text-text-3 hover:text-text transition-opacity"
                        aria-label={`Editar tag ${tag}`}
                        title="Editar tag"
                      >
                        <Pencil size={11} />
                      </button>

                      {/* Botão de Excluir Tag */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="opacity-60 hover:opacity-100 p-0.5 rounded text-text-3 hover:text-warn transition-opacity"
                        aria-label={`Remover tag ${tag}`}
                        title={`Remover ${tag}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Restaurar Tags Padrão */}
          <div className="pt-2 border-t border-line flex items-center justify-between">
            <span className="text-[11px] text-text-4">Padrão de fábrica: 8 tags essenciais</span>
            <button
              type="button"
              onClick={handleResetTags}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1.5 text-[11px] font-bold text-text-2 hover:text-text hover:border-line-2 transition-colors min-h-[38px]"
            >
              <RotateCcw size={13} />
              <span>Restaurar Tags Padrão</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
