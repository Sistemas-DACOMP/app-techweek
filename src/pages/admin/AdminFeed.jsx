import { useRef, useState } from 'react';
import {
  Send,
  Image as ImageIcon,
  Video,
  X,
  Pin,
  Trash2,
  Bell,
  Smartphone,
  Radio,
  Sparkles,
  Loader2,
  CheckCircle2,
  Navigation,
  Link2,
  Calendar,
  QrCode,
  Trophy,
  Award,
  Home,
  Newspaper
} from 'lucide-react';
import { btn, ICON_BTN, PageHead, Section, Switch, EmptyState } from './ui';

export const PUSH_DESTINATIONS = [
  { id: '/feed', label: 'Feed Oficial', path: '/feed', desc: 'Timeline de comunicados', icon: Newspaper, defaultAction: 'Ver no Feed' },
  { id: '/agenda', label: 'Programação', path: '/agenda', desc: 'Grade de palestras e horários', icon: Calendar, defaultAction: 'Ver Programação' },
  { id: '/scanner', label: 'Scanner QR', path: '/scanner', desc: 'Check-in e conexões', icon: QrCode, defaultAction: 'Abrir Scanner' },
  { id: '/challenges', label: 'Missões', path: '/challenges', desc: 'Gamificação e desafios', icon: Trophy, defaultAction: 'Ver Missões' },
  { id: '/ranking', label: 'Ranking', path: '/ranking', desc: 'Pontuação dos participantes', icon: Award, defaultAction: 'Ver Ranking' },
  { id: '/', label: 'Início', path: '/', desc: 'Página inicial do app', icon: Home, defaultAction: 'Abrir Início' },
  { id: 'custom', label: 'Outro Link', path: 'custom', desc: 'Rota interna ou link web', icon: Link2, defaultAction: 'Abrir Detalhes' }
];

const DEFAULT_TEMPLATES = [
  { label: '📢 Palestra em 15 min', text: '📢 ATENÇÃO: A próxima palestra no Anfiteatro Principal iniciará em 15 minutos! Preparem o app para fazer o check-in presencial.' },
  { label: '☕ Coffee Break', text: '☕ Coffee Break liberado no Hall Central! Convidamos todos a aproveitar para recarregar as energias e fazer networking com os palestrantes.' },
  { label: '🚀 Nova Missão', text: '🚀 Nova missão liberada no app! Visite os estandes dos patrocinadores para desbloquear palavras-chave e subir no ranking.' },
  { label: '⚠️ Mudança de Sala', text: '⚠️ Informamos que a oficina prática foi transferida para o Laboratório de Informática 2 (Bloco 5R). Esperamos vocês!' }
];

export default function AdminFeed({
  feedPosts = [],
  feedInput = '',
  setFeedInput,
  feedChannel = 'feed',
  setFeedChannel,
  feedActionUrl = '/feed',
  setFeedActionUrl,
  feedCustomUrl = '',
  setFeedCustomUrl,
  feedActionLabel = '',
  setFeedActionLabel,
  feedIsPinned = false,
  setFeedIsPinned,
  feedMediaFile = null,
  feedMediaPreview = null,
  handleAdminFeedFileSelect,
  handleRemoveAdminFeedMedia,
  adminFeedFileInputRef,
  feedSubmitting = false,
  isUploadingFeedMedia = false,
  handlePublishFeed,
  handleTogglePinPost,
  handleDeletePost,
  currentAdminAvatar,
  feedTemplates = DEFAULT_TEMPLATES
}) {
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const internalFileInputRef = useRef(null);
  const fileInputRef = adminFeedFileInputRef || internalFileInputRef;

  const charCount = feedInput.length;
  const maxChars = 500;
  const isOverLimit = charCount > maxChars;

  const channels = [
    { id: 'feed', label: 'Apenas Feed', icon: Smartphone, desc: 'Timeline social do app' },
    { id: 'both', label: 'Feed + Push', icon: Radio, desc: 'Timeline e notificação imediata' },
    { id: 'broadcast', label: 'Apenas Push', icon: Bell, desc: 'Alerta push para todos os aparelhos' }
  ];

  return (
    <div className="pb-12">
      <PageHead
        title="Feed & Comunicação Oficial"
        subtitle={`${feedPosts.length} publicações ativas na timeline do evento`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* COLUNA ESQUERDA: Formulário de Composição */}
        <div className="flex flex-col gap-5">
          <Section
            title="Criar Publicação Oficial"
            subtitle="Transmita comunicados, avisos e alertas em tempo real aos participantes."
            className="border border-line-2 shadow-xl"
          >
            <form onSubmit={handlePublishFeed} className="flex flex-col gap-4">
              {/* Seletor Segmentado de Canais */}
              <div>
                <label className="mb-2 block text-[13px] font-extrabold text-text">Canal de Destino</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {channels.map((ch) => {
                    const sel = feedChannel === ch.id;
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setFeedChannel(ch.id)}
                        className={`press flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                          sel
                            ? 'border-link bg-action/15 text-text shadow-[0_0_0_2px_rgba(143,160,255,0.3)]'
                            : 'border-line-2 bg-surface-raised text-text-3 hover:border-line hover:text-text'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon size={16} className={sel ? 'text-link' : 'text-text-3'} />
                          {sel && <span className="h-2 w-2 rounded-full bg-link" />}
                        </div>
                        <span className="text-[13px] font-black">{ch.label}</span>
                        <span className="text-[11px] leading-tight text-text-3">{ch.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Redirecionamento da Notificação Push */}
              {(feedChannel === 'broadcast' || feedChannel === 'both') && (
                <div className="rounded-2xl border border-line-2 bg-surface-raised p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[13px] font-extrabold text-text">
                      <Navigation size={15} className="text-link" />
                      <span>Destino ao Clicar na Notificação</span>
                    </label>
                    <span className="text-[11px] font-medium text-text-3">
                      Onde o app abrirá
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PUSH_DESTINATIONS.map((dest) => {
                      const isSelected = feedActionUrl === dest.id;
                      const DestIcon = dest.icon;
                      return (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => setFeedActionUrl(dest.id)}
                          className={`press flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-link bg-action/20 text-text shadow-[0_0_0_2px_rgba(143,160,255,0.3)]'
                              : 'border-line-2 bg-bg text-text-3 hover:border-line hover:text-text'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <DestIcon size={15} className={isSelected ? 'text-link' : 'text-text-3'} />
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-link" />}
                          </div>
                          <span className="text-[12px] font-bold leading-tight">{dest.label}</span>
                          <span className="text-[10px] leading-tight text-text-4">{dest.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Campo de link personalizado caso escolha 'custom' */}
                  {feedActionUrl === 'custom' && (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
                      <div>
                        <label htmlFor="feed-custom-url" className="mb-1 block text-[11px] font-extrabold text-text-2">
                          URL ou Rota Personalizada
                        </label>
                        <input
                          id="feed-custom-url"
                          type="text"
                          required={feedActionUrl === 'custom'}
                          placeholder="/perfil, /recompensas ou https://link-externo.com"
                          value={feedCustomUrl}
                          onChange={(e) => setFeedCustomUrl(e.target.value)}
                          className="w-full rounded-xl border border-line-2 bg-surface-raised px-3 py-2 text-[13px] text-text outline-none focus:border-link"
                        />
                        <span className="mt-1 block text-[10px] text-text-4">
                          Rotas internas começam com / (ex: /agenda). Links externos devem começar com https://
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rótulo opcional do botão da notificação */}
                  <div className="mt-3">
                    <label htmlFor="feed-action-label" className="mb-1 block text-[11px] font-extrabold text-text-2">
                      Texto do Botão de Ação <span className="font-normal text-text-4">(Opcional)</span>
                    </label>
                    <input
                      id="feed-action-label"
                      type="text"
                      maxLength={32}
                      placeholder={
                        PUSH_DESTINATIONS.find((d) => d.id === feedActionUrl)?.defaultAction || 'Abrir Notificação'
                      }
                      value={feedActionLabel}
                      onChange={(e) => setFeedActionLabel(e.target.value)}
                      className="w-full rounded-xl border border-line-2 bg-bg px-3 py-2 text-[13px] text-text outline-none focus:border-link"
                    />
                  </div>
                </div>
              )}

              {/* Modelos Rápidos (Templates) */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-text-3">
                  <Sparkles size={14} className="text-link" />
                  <span>Modelos Rápidos para Avisos</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {feedTemplates.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFeedInput(tpl.text)}
                      className="press rounded-xl border border-line-2 bg-surface-raised px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-link hover:text-text"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea de Conteúdo */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="adm-feed-input" className="text-[13px] font-extrabold text-text">
                    Mensagem do Comunicado
                  </label>
                  <span
                    className={`text-[12px] font-bold ${
                      isOverLimit ? 'text-err font-extrabold' : charCount > 400 ? 'text-amber-400' : 'text-text-4'
                    }`}
                  >
                    {charCount}/{maxChars}
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="adm-feed-input"
                    rows={4}
                    required
                    placeholder="Escreva a mensagem que os participantes visualizarão na timeline ou receberão via Push..."
                    value={feedInput}
                    onChange={(e) => setFeedInput(e.target.value)}
                    className="w-full resize-y rounded-2xl border border-line-2 bg-bg p-3.5 text-[14px] leading-relaxed text-text outline-none transition-colors placeholder:text-text-4 focus:border-link"
                  />
                </div>
              </div>

              {/* Upload de Mídia com Preview */}
              <div>
                <label className="mb-2 block text-[13px] font-extrabold text-text">
                  Anexar Mídia <span className="text-[12px] font-normal text-text-3">(Opcional · Foto até 50MB ou Vídeo até 250MB)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  onChange={handleAdminFeedFileSelect}
                  className="hidden"
                />

                {!feedMediaPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="press flex w-full items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line-2 bg-surface-raised p-4 text-[13px] font-bold text-text-2 transition-colors hover:border-link hover:text-text"
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon size={18} className="text-link" />
                      <Video size={18} className="text-[#A855F7]" />
                      <span>Selecionar Foto ou Vídeo do Computador</span>
                    </div>
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-line-2 bg-surface-raised p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action/20 text-link">
                          {feedMediaPreview.type === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="m-0 truncate text-[13px] font-bold text-text">{feedMediaPreview.name}</p>
                          <span className="text-[11px] font-medium uppercase text-text-3">
                            {feedMediaPreview.type === 'video' ? 'Vídeo Anexo' : 'Imagem Anexa'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAdminFeedMedia}
                        aria-label="Remover mídia"
                        className="press flex h-8 w-8 items-center justify-center rounded-lg bg-err/15 text-err hover:bg-err/25"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Miniatura do preview */}
                    <div className="mt-3 overflow-hidden rounded-xl bg-black">
                      {feedMediaPreview.type === 'video' ? (
                        <video
                          src={feedMediaPreview.url}
                          controls
                          className="max-h-[220px] w-full object-contain"
                        />
                      ) : (
                        <img
                          src={feedMediaPreview.url}
                          alt="Prévia da imagem"
                          className="max-h-[220px] w-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Switch de Fixar no Topo */}
              <div className="flex items-center justify-between rounded-2xl border border-line-2 bg-surface-raised p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-link/15 text-link">
                    <Pin size={16} />
                  </div>
                  <div>
                    <span className="block text-[13px] font-extrabold text-text">Fixar no Topo do Feed</span>
                    <span className="block text-[11px] text-text-3">O aviso permanece em destaque para todos os usuários</span>
                  </div>
                </div>
                <Switch
                  checked={feedIsPinned}
                  onChange={(v) => setFeedIsPinned(v)}
                  label="Fixar no topo"
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={feedSubmitting || isUploadingFeedMedia || isOverLimit || !feedInput.trim()}
                className={btn('action', 'mt-1 h-12 w-full text-[15px] font-black')}
              >
                {feedSubmitting || isUploadingFeedMedia ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>
                      {isUploadingFeedMedia
                        ? 'Fazendo Upload de Mídia...'
                        : feedChannel === 'broadcast'
                        ? 'Disparando Notificação Push...'
                        : feedChannel === 'both'
                        ? 'Publicando & Disparando Push...'
                        : 'Publicando no Feed...'}
                    </span>
                  </>
                ) : (
                  <>
                    {feedChannel === 'broadcast' ? (
                      <Bell size={16} />
                    ) : feedChannel === 'both' ? (
                      <Radio size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>
                      {feedChannel === 'broadcast'
                        ? 'Disparar Notificação Push'
                        : feedChannel === 'both'
                        ? 'Publicar no Feed & Disparar Push'
                        : 'Publicar no Feed Oficial'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </Section>
        </div>

        {/* COLUNA DIREITA: Live Previews + Publicações Ativas */}
        <div className="flex flex-col gap-5">
          {/* Live Preview de Notificação Push */}
          {(feedChannel === 'broadcast' || feedChannel === 'both') && (
            <div className="rounded-[24px] border border-link/40 bg-surface p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-link">
                  <Bell size={14} />
                  <span>Prévia da Notificação Push (Tela de Bloqueio)</span>
                </span>
                <span className="rounded-full bg-link/15 px-2.5 py-0.5 text-[11px] font-extrabold text-link">
                  Push Preview
                </span>
              </div>

              {/* Card estilo banner de notificação móvel / Web Push */}
              <div className="overflow-hidden rounded-2xl border border-line-2 bg-bg/95 p-3.5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between text-[11px] text-text-3">
                  <div className="flex items-center gap-1.5 font-bold">
                    <div className="flex h-4 w-4 items-center justify-center rounded bg-link text-[9px] font-black text-black">
                      TW
                    </div>
                    <span>FACOM TECHWEEK</span>
                  </div>
                  <span>Agora</span>
                </div>

                <div className="mt-2">
                  <p className="text-[13px] font-black text-text">Comunicado Oficial</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-2">
                    {feedInput.trim() || 'A mensagem da notificação aparecerá aqui para os participantes...'}
                  </p>
                </div>

                {/* Destino e Botão de Ação */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-3">
                    <Navigation size={12} className="text-link" />
                    <span>Destino:</span>
                    <span className="font-bold text-text">
                      {feedActionUrl === 'custom'
                        ? feedCustomUrl || '/ (Início)'
                        : PUSH_DESTINATIONS.find((d) => d.id === feedActionUrl)?.label || 'Feed Oficial'}
                    </span>
                  </div>
                  <span className="rounded-lg bg-action/20 px-2.5 py-1 text-[11px] font-extrabold text-link">
                    {feedActionLabel ||
                      PUSH_DESTINATIONS.find((d) => d.id === feedActionUrl)?.defaultAction ||
                      'Abrir Notificação'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview no Formato do Participante (Feed) */}
          {feedChannel !== 'broadcast' && (
            <div className="rounded-[24px] border border-line-2 bg-surface p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-text-2">Prévia no Feed do Participante</span>
                <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[11px] font-bold text-text-3">
                  Live Preview
                </span>
              </div>

              {/* Card estilo feed do participante */}
              <div className="rounded-[20px] border border-line-2 bg-bg p-4 shadow-inner">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentAdminAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'}
                      alt="Comissão"
                      className="h-10 w-10 rounded-full border border-action object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-text">Comissão FACOM TechWeek</span>
                        <span className="rounded bg-action/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-link">
                          Oficial
                        </span>
                      </div>
                      <span className="text-[11px] text-text-4">Agora mesmo · Aberto a todos</span>
                    </div>
                  </div>

                  {feedIsPinned && (
                    <span className="flex items-center gap-1 rounded-full bg-link/15 px-2.5 py-1 text-[11px] font-extrabold text-link">
                      <Pin size={12} /> Fixado
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
                  {feedInput.trim() || 'A sua mensagem aparecerá aqui em tempo real enquanto você digita...'}
                </p>

                {feedMediaPreview && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-black">
                    {feedMediaPreview.type === 'video' ? (
                      <video src={feedMediaPreview.url} className="max-h-[200px] w-full object-contain" />
                    ) : (
                      <img src={feedMediaPreview.url} alt="" className="max-h-[200px] w-full object-cover" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de Publicações Ativas */}
          <Section
            title={`Publicações Ativas (${feedPosts.length})`}
            subtitle="Postagens atualmente visíveis na timeline do evento."
            className="border border-line-2"
          >
            {feedPosts.length === 0 ? (
              <EmptyState>Nenhuma publicação oficial ativa no momento.</EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                {feedPosts.map((post) => {
                  const isPinned = Boolean(post.pinned);
                  return (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-line bg-surface-raised p-4 transition-all hover:border-line-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {post.authorAvatar ? (
                            <img
                              src={post.authorAvatar}
                              alt=""
                              className="h-8 w-8 rounded-full border border-line-2 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action/20 text-[11px] font-black text-link">
                              TW
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-extrabold text-text">
                                {post.author || 'Organização'}
                              </span>
                              {isPinned && (
                                <span className="flex items-center gap-1 rounded-full bg-link/20 px-2 py-0.5 text-[10px] font-black text-link">
                                  <Pin size={10} /> Fixado
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-text-4">
                              {post.formattedTime || 'Recentemente'}
                            </span>
                          </div>
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePinPost(post.id, isPinned)}
                            title={isPinned ? 'Desafixar do topo' : 'Fixar no topo'}
                            aria-label={isPinned ? 'Desafixar' : 'Fixar'}
                            className={`${ICON_BTN} ${isPinned ? 'bg-link/20 text-link' : ''}`}
                          >
                            <Pin size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
                                handleDeletePost(post.id);
                              }
                            }}
                            title="Excluir publicação"
                            aria-label="Excluir publicação"
                            className={`${ICON_BTN} text-err hover:bg-err/15`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-text-2">
                        {post.content}
                      </p>

                      {post.videoUrl ? (
                        <div className="mt-3 overflow-hidden rounded-xl bg-black">
                          <video src={post.videoUrl} controls className="max-h-[220px] w-full object-contain" />
                        </div>
                      ) : post.imageUrl ? (
                        <div className="mt-3 overflow-hidden rounded-xl">
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="max-h-[220px] w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
