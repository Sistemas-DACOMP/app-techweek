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
  AtSign,
  Upload,
  Camera,
  Trash2,
  Building2,
  Heart,
  Share2,
} from 'lucide-react';
import {
  getSponsorSettings,
  saveSponsorSettings,
  resetTagsToDefault,
  resetFeedProfileToDefault,
  sanitizeFeedHandle,
  interpolateTemplate,
  DEFAULT_QUALIFICATION_TAGS,
  DEFAULT_WHATSAPP_TEMPLATES,
  DEFAULT_FEED_PROFILE,
} from '../../lib/sponsorSettingsService';
import { uploadFeedMedia } from '../../lib/feedService';
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
  sponsorLogo = '',
  sponsorTier = 'GOLD',
  defaultSection = 'feed',
  onSettingsSaved,
}) {
  // Configurações persistidas
  const [settings, setSettings] = useState(() => getSponsorSettings(companyId));

  // Sub-Aba Ativa: 'feed' | 'messages_tags'
  const [activeSection, setActiveSection] = useState(defaultSection);

  // Estado do Perfil de Feed
  const [feedHandle, setFeedHandle] = useState(
    () => settings.feedProfile?.handle || (companyId !== 'default' ? `@${companyId}` : '')
  );
  const [feedAvatarUrl, setFeedAvatarUrl] = useState(() => settings.feedProfile?.avatarUrl || '');
  const [feedDisplayName, setFeedDisplayName] = useState(() => settings.feedProfile?.displayName || '');
  const [isFeedProfileDirty, setIsFeedProfileDirty] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarFileInputRef = useRef(null);

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

    setFeedHandle(loaded.feedProfile?.handle || (companyId !== 'default' ? `@${companyId}` : ''));
    setFeedAvatarUrl(loaded.feedProfile?.avatarUrl || '');
    setFeedDisplayName(loaded.feedProfile?.displayName || '');
    setIsFeedProfileDirty(false);
  }, [companyId]);

  // =========================================================================
  // GESTÃO DO PERFIL NO FEED
  // =========================================================================

  const handleAvatarFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    setIsUploadingAvatar(true);
    try {
      const res = await uploadFeedMedia(file);
      if (res?.url) {
        setFeedAvatarUrl(res.url);
        setIsFeedProfileDirty(true);
        showToast('Foto de perfil carregada com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao enviar foto de perfil:', err);
      setAvatarError(err.message || 'Falha ao carregar a foto.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleUseCompanyLogo = () => {
    if (!sponsorLogo) return;
    setFeedAvatarUrl(sponsorLogo);
    setIsFeedProfileDirty(true);
    showToast('Logo oficial da empresa aplicada!', 'success');
  };

  const handleRemoveAvatar = () => {
    setFeedAvatarUrl('');
    setIsFeedProfileDirty(true);
    showToast('Foto de perfil removida.', 'info');
  };

  const handleSaveFeedProfile = () => {
    const cleanHandle = sanitizeFeedHandle(feedHandle || `@${companyId}`);
    const updated = saveSponsorSettings(companyId, {
      ...settings,
      feedProfile: {
        handle: cleanHandle,
        avatarUrl: feedAvatarUrl.trim(),
        displayName: feedDisplayName.trim(),
      },
    });

    setSettings(updated);
    setFeedHandle(updated.feedProfile.handle);
    setIsFeedProfileDirty(false);
    showToast('Perfil do Feed salvo e atualizado!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  const handleResetFeedProfile = () => {
    const updated = resetFeedProfileToDefault(companyId);
    setSettings(updated);
    setFeedHandle(updated.feedProfile.handle);
    setFeedAvatarUrl(updated.feedProfile.avatarUrl);
    setFeedDisplayName(updated.feedProfile.displayName);
    setIsFeedProfileDirty(false);
    showToast('Perfil do Feed restaurado para o padrão original.', 'info');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

  // =========================================================================
  // GESTÃO DE MODELOS DE WHATSAPP
  // =========================================================================

  const handleSelectTemplate = (templateId) => {
    const tpl = settings.templates.find((t) => t.id === templateId) || DEFAULT_WHATSAPP_TEMPLATES[0];
    setSelectedTemplateId(templateId);
    setTemplateText(tpl.text);
    setIsTemplateDirty(false);
  };

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

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variableTag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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

  const handleSetAsDefaultTemplate = (templateId) => {
    const updated = saveSponsorSettings(companyId, {
      ...settings,
      activeTemplateId: templateId,
    });
    setSettings(updated);
    showToast('Modelo definido como padrão!', 'success');
    if (onSettingsSaved) onSettingsSaved(updated);
  };

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

  // =========================================================================
  // GESTÃO DE TAGS DE QUALIFICAÇÃO
  // =========================================================================

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

  // Preview interpolado dinâmico do WhatsApp
  const activeSample = SAMPLE_CANDIDATES[selectedSampleIndex] || SAMPLE_CANDIDATES[0];
  const interpolatedPreview = useMemo(() => {
    return interpolateTemplate(templateText, {
      name: activeSample.name,
      companyName,
      course: activeSample.course,
    });
  }, [templateText, activeSample, companyName]);

  const isCurrentActiveOutreach = settings.activeTemplateId === selectedTemplateId;

  // Variáveis para Live Preview do Feed
  const displayAuthor = feedDisplayName.trim() || companyName;
  const displayHandle = feedHandle.trim() || (companyId !== 'default' ? `@${companyId}` : '@patrocinador');
  const displayAvatar = feedAvatarUrl.trim() || sponsorLogo || '';
  const displayTierLabel =
    sponsorTier === 'DIAMOND'
      ? 'Patrocinador Diamante'
      : sponsorTier === 'SILVER'
      ? 'Patrocinador Prata'
      : sponsorTier === 'BRONZE'
      ? 'Patrocinador Bronze'
      : 'Patrocinador Ouro';

  const SETTINGS_SECTIONS = [
    {
      id: 'feed',
      label: 'Perfil no Feed',
      icon: AtSign,
      badge: 'Público',
      description: 'Foto de perfil e @handle no Feed',
    },
    {
      id: 'messages_tags',
      label: 'Mensagens & Tags',
      icon: MessageSquare,
      badge: `${activeTags.length} tags`,
      description: 'Modelos de WhatsApp e tags de qualificação',
    },
  ];

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
            Configure o perfil público no Feed, modelos de WhatsApp e tags para a equipe {companyName}.
          </p>
        </div>
      </div>

      {/* Navegação entre Sub-Abas (Perfil no Feed | Mensagens & Tags) */}
      <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto">
        {SETTINGS_SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          const IconComp = sec.icon;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              aria-pressed={isActive}
              className={`press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all border min-h-[44px] shrink-0 ${
                isActive
                  ? 'bg-surface-selected border-link text-text shadow-sm ring-1 ring-link/40'
                  : 'bg-surface-raised border-line text-text-3 hover:text-text hover:bg-surface-selected/60'
              }`}
            >
              <IconComp size={15} className={isActive ? 'text-link' : 'text-text-4'} />
              <span>{sec.label}</span>
              {sec.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? 'bg-link/20 text-link border border-link/30'
                      : 'bg-surface border border-line text-text-4'
                  }`}
                >
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: PERFIL NO FEED (AVATAR E @HANDLE)                              */}
      {/* ========================================================================= */}
      <div
        style={{ display: activeSection === 'feed' ? 'block' : 'none' }}
        className="w-full"
      >
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Coluna de Configuração do Perfil (7 Colunas no Desktop XL) */}
          <section
            aria-labelledby="section-feed-title"
            className="xl:col-span-7 flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-5 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
              <div>
                <h2 id="section-feed-title" className="text-[16px] font-extrabold text-text m-0">
                  Perfil no Feed
                </h2>
                <p className="text-[12px] text-text-3 mt-0.5 m-0">
                  Defina a foto de perfil e o @handle oficial que aparecem nas postagens públicas.
                </p>
              </div>

              {isFeedProfileDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 border border-warn/30 px-2.5 py-0.5 text-[11px] font-bold text-warn shrink-0">
                  Alterações não salvas
                </span>
              )}
            </div>

            {/* Bloco de Foto de Perfil (Avatar) */}
            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-bold text-text">
                Foto de Perfil (Avatar)
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Preview Circular 72px */}
                <div className="relative size-[72px] rounded-full border-2 border-line bg-surface-raised flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayAuthor}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Building2 size={28} className="text-text-4" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-surface/80 flex items-center justify-center text-[10px] font-bold text-link animate-pulse">
                      Enviando...
                    </div>
                  )}
                </div>

                {/* Ações de Foto */}
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelected}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className={btn('secondary', 'min-h-[44px] px-3.5 text-[12px] shrink-0')}
                      title="Fazer upload de foto do computador ou celular"
                    >
                      <Camera size={14} />
                      <span>{feedAvatarUrl ? 'Alterar foto' : 'Enviar foto'}</span>
                    </button>

                    {sponsorLogo && sponsorLogo !== feedAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleUseCompanyLogo}
                        className={btn('secondary', 'min-h-[44px] px-3.5 text-[12px] shrink-0')}
                        title="Usar logo cadastrada da empresa"
                      >
                        <Upload size={14} />
                        <span>Usar logo oficial</span>
                      </button>
                    )}

                    {feedAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className={btn('secondary', 'min-h-[44px] px-3 text-[12px] text-warn shrink-0')}
                        title="Remover foto personalizada"
                      >
                        <Trash2 size={13} />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  {avatarError && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-warn">
                      <AlertCircle size={12} /> {avatarError}
                    </span>
                  )}
                </div>
              </div>

              {/* URL Direta de Imagem */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[11px] text-text-4">Ou informe a URL direta de uma imagem:</span>
                <input
                  type="url"
                  value={feedAvatarUrl}
                  onChange={(e) => {
                    setFeedAvatarUrl(e.target.value);
                    setIsFeedProfileDirty(true);
                  }}
                  placeholder="https://exemplo.com/sua-logo.png"
                  className="w-full rounded-xl border border-field-line bg-field px-3.5 py-2 text-[12px] text-text font-mono placeholder-text-4 focus:border-link focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            {/* Campo: @ Identificador no Feed */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-line">
              <label htmlFor="feed-handle-input" className="text-[12px] font-bold text-text">
                @ Identificador no Feed
              </label>

              <div className="flex items-center rounded-xl border border-field-line bg-field focus-within:border-link focus-within:ring-1 focus-within:ring-link overflow-hidden min-h-[44px]">
                <span className="px-3.5 text-text-3 font-mono font-bold select-none text-[14px]">@</span>
                <input
                  type="text"
                  id="feed-handle-input"
                  value={feedHandle.replace(/^@/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
                    setFeedHandle(raw ? `@${raw}` : '');
                    setIsFeedProfileDirty(true);
                  }}
                  placeholder={companyId || 'empresa'}
                  maxLength={24}
                  className="flex-1 bg-transparent py-2.5 pr-3 text-[13px] font-mono text-text placeholder-text-4 focus:outline-none"
                />
                <span className="pr-3 text-[11px] font-mono text-text-4">
                  {feedHandle.replace(/^@/, '').length}/24
                </span>
              </div>
              <p className="text-[11px] text-text-4 m-0">
                Como os participantes verão sua empresa no Feed (ex: @kanastra, @bayer). Apenas letras minúsculas, números, ponto e underline.
              </p>
            </div>

            {/* Campo: Nome de Exibição no Feed */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="feed-display-name-input" className="text-[12px] font-bold text-text">
                Nome de Exibição no Feed
              </label>

              <input
                type="text"
                id="feed-display-name-input"
                value={feedDisplayName}
                onChange={(e) => {
                  setFeedDisplayName(e.target.value);
                  setIsFeedProfileDirty(true);
                }}
                placeholder={companyName}
                maxLength={40}
                className="w-full rounded-xl border border-field-line bg-field px-3.5 py-2.5 text-[13px] text-text placeholder-text-4 focus:border-link focus:outline-none min-h-[44px]"
              />
              <p className="text-[11px] text-text-4 m-0">
                Nome exibido em destaque no cabeçalho das publicações. Deixe em branco para usar "{companyName}".
              </p>
            </div>

            {/* Ações do Perfil */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={handleResetFeedProfile}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-[12px] font-semibold text-text-3 hover:text-text hover:border-line-2 transition-colors min-h-[44px]"
              >
                <RotateCcw size={13} />
                <span>Restaurar perfil padrão</span>
              </button>

              <button
                type="button"
                onClick={handleSaveFeedProfile}
                disabled={!isFeedProfileDirty}
                className={btn(
                  isFeedProfileDirty ? 'action' : 'secondary',
                  `min-h-[44px] px-5 text-[13px] ${!isFeedProfileDirty ? 'opacity-50 cursor-not-allowed' : ''}`
                )}
              >
                <Save size={14} />
                <span>Salvar Perfil do Feed</span>
              </button>
            </div>
          </section>

          {/* Coluna de Live Preview do Feed (5 Colunas no Desktop XL) */}
          <aside className="xl:col-span-5 flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-[14px] font-extrabold text-text m-0">
                Pré-visualização no Feed
              </h3>
              <span className="text-[11px] font-semibold text-text-4">
                Como os usuários verão
              </span>
            </div>

            {/* Mini Card Autêntico do Feed */}
            <article className="rounded-2xl border border-line bg-surface-raised/40 p-4 shadow-sm flex flex-col gap-3 mt-1">
              {/* Header do Post */}
              <div className="flex items-start gap-3">
                <div className="relative size-10 rounded-full border border-line overflow-hidden bg-surface flex items-center justify-center shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayAuthor}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Building2 size={18} className="text-text-3" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[14px] text-text truncate">
                      {displayAuthor}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#FBBF24]/15 border border-[#FBBF24]/30 text-[#FBBF24]">
                      {displayTierLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-text-3 mt-0.5">
                    <span className="font-semibold text-text-2">{displayHandle}</span>
                    <span className="opacity-40">•</span>
                    <span>Agora</span>
                  </div>
                </div>
              </div>

              {/* Conteúdo Exemplo */}
              <p className="text-[13px] leading-relaxed text-text m-0">
                Conheça nossos desafios de engenharia e vagas de estágio na TechWeek 2026! Venha conversar com nossa equipe no estande da {companyName}.
              </p>

              {/* Barra de Engajamento Simulada */}
              <div className="flex items-center gap-4 pt-2 border-t border-line text-text-3 text-[12px]">
                <div className="inline-flex items-center gap-1">
                  <Heart size={14} className="text-red-400 fill-red-400" />
                  <span className="font-semibold text-text-2">24</span>
                </div>
                <div className="inline-flex items-center gap-1">
                  <MessageSquare size={14} />
                  <span>6</span>
                </div>
                <div className="inline-flex items-center gap-1 ml-auto">
                  <Share2 size={13} />
                </div>
              </div>
            </article>

            {/* Dica de Integração */}
            <div className="rounded-xl border border-line bg-surface-raised/20 p-3 text-[11px] text-text-3 leading-relaxed">
              <p className="m-0">
                Esta foto e @handle serão aplicados automaticamente a qualquer postagem ou aviso publicado pela sua empresa no Feed da TechWeek.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 2: MENSAGENS DE WHATSAPP E TAGS JUNTAS (LADO A LADO NO DESKTOP)    */}
      {/* ========================================================================= */}
      <div
        style={{ display: activeSection === 'messages_tags' ? 'block' : 'none' }}
        className="w-full"
      >
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ===================================================================== */}
          {/* BLOCO A: MODELOS DE WHATSAPP (7 Colunas no Desktop XL)                */}
          {/* ===================================================================== */}
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

            {/* Live Preview do WhatsApp */}
            <div className="mt-1 flex flex-col gap-2 rounded-xl border border-line bg-surface-raised/40 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-text-3" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-3">
                    Pré-visualização (WhatsApp)
                  </span>
                </div>

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

          {/* ===================================================================== */}
          {/* BLOCO B: TAGS DE QUALIFICAÇÃO DO ESTANDE (5 Colunas no Desktop XL)    */}
          {/* ===================================================================== */}
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
    </div>
  );
}
