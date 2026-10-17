import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Share,
  Star,
  Send,
  Plus,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Building2,
  Loader2,
  ShieldCheck,
  Film,
  Trash2
} from 'lucide-react';
import { subscribeToFeedPosts, createFeedPost, deleteFeedPost, toggleLikeFeedPost, uploadFeedMedia, DEFAULT_FEED_POSTS } from '../lib/feedService';
import { getSponsorSettings } from '../lib/sponsorSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getCachedUserProfile, isAdminEmail } from '../lib/userService';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import Mascot from '../components/Mascot';
import ConfirmModal from '../components/ConfirmModal';
import iconeTw from '../assets/icone.png';

export const FILTERS = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ORGANIZATION', label: 'Organização' },
  { id: 'SPONSOR', label: 'Patrocinadores' }
];

// Cota do patrocinador (DESIGN.md §2.6). O post/autor ainda não expõe esse campo no backend
// (DESIGN.md §12) — sem `sponsorTier`/`tier`, o post cai no card normal.
export const TIERS = {
  DIAMOND: { label: 'Diamante', text: 'var(--tier-diamante-text)', chip: 'rgba(34,211,238,0.14)', tint: 'rgba(34,211,238,0.12)', line: 'rgba(103,232,249,0.38)' },
  GOLD: { label: 'Ouro', text: 'var(--tier-ouro-text)', chip: 'rgba(251,191,36,0.16)', tint: 'rgba(251,191,36,0.12)', line: 'rgba(251,191,36,0.4)' },
  SILVER: { label: 'Prata', text: 'var(--tier-prata-text)', chip: 'rgba(203,213,225,0.12)' }
};
export const EMPTY_TEXT = {
  ALL: 'Nenhuma publicação ainda.',
  ORGANIZATION: 'Nenhuma publicação da organização ainda.',
  SPONSOR: 'Nenhuma publicação de patrocinadores ainda.'
};
export const TIER_ALIASES = { DIAMANTE: 'DIAMOND', OURO: 'GOLD', PRATA: 'SILVER' };
export const tierOf = (post) => {
  const raw = String(post.sponsorTier || post.tier || '').toUpperCase();
  return TIERS[TIER_ALIASES[raw] || raw] || null;
};

export const timeAgo = (iso) => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(min)) return 'Recente';
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} d`;
};

// Rosa do "curtir" (DESIGN.md §6 Feed) — ainda sem token próprio no :root.
export const LIKE_PINK = '#F59AC0';

export function VerifiedBadge() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" role="img" aria-label="verificado" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="var(--action)" />
      <path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PostCard({ post, featured, isLiked, popping, onLike, onPopEnd, onShare, canDelete, onDelete }) {
  const isOrg = post.authorRole === 'ORGANIZATION';
  const tier = isOrg ? null : tierOf(post);
  const tinted = tier && tier.tint;
  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const hasVideo = post.videoUrl || (post.mediaType === 'video' && post.mediaUrl);
  const hasImage = post.imageUrl || (post.mediaType === 'image' && post.mediaUrl) || (!hasVideo && post.mediaUrl);

  return (
    <article
      className="rounded-[18px] border border-transparent bg-surface p-4!"
      style={
        featured
          ? { borderColor: '#2E2A6B' }
          : tinted
            ? { background: `linear-gradient(160deg, ${tier.tint}, var(--surface) 45%)`, borderColor: tier.line }
            : undefined
      }
    >
      {featured && (
        <p className="mb-2.5! flex items-center gap-1.5 text-xs font-bold text-[#C4B5FD]">
          <Star size={14} strokeWidth={2.2} aria-hidden="true" />
          Publicação em destaque
        </p>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full ${
            isOrg ? '' : tinted ? 'bg-[#F4F5FA]' : 'bg-surface-raised'
          }`}
          style={isOrg ? { background: 'var(--brand-gradient)' } : undefined}
        >
          {isOrg ? (
            <img src={iconeTw} alt="" className="h-[22px] w-5 object-contain brightness-0 invert" />
          ) : post.authorAvatar ? (
            <img src={post.authorAvatar} alt="" className="size-full object-cover" />
          ) : (
            <Building2 size={18} className="text-text-3" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-text">
            <h2 className="truncate text-sm font-bold">{post.author}</h2>
            {isOrg && <VerifiedBadge />}
            {tier && (
              <span
                className="shrink-0 rounded-[10px] px-2! py-0.5! text-[11px] font-extrabold"
                style={{ background: tier.chip, color: tier.text }}
                aria-label={`Patrocinador ${tier.label}`}
              >
                {tier.label}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-3">
            {post.authorHandle && (
              <span className="font-semibold text-text-2">
                {post.authorHandle.startsWith('@') ? post.authorHandle : `@${post.authorHandle}`}
              </span>
            )}
            {post.authorHandle && <span className="opacity-40">•</span>}
            <span>{post.formattedTime || timeAgo(post.createdAt)}</span>
          </span>
        </span>
      </div>

      <p className="mt-2.5! whitespace-pre-wrap break-words text-[15px] leading-normal text-text">{post.content}</p>

      {hasVideo && (
        <video
          controls
          playsInline
          preload="metadata"
          src={post.videoUrl || post.mediaUrl}
          className="mt-3! block max-h-[380px] w-full rounded-[14px] bg-black"
        />
      )}
      {!hasVideo && hasImage && (
        <img
          src={post.imageUrl || post.mediaUrl}
          alt="Anexo da publicação"
          loading="lazy"
          className="mt-3! block max-h-[300px] w-full rounded-[14px] bg-surface-raised object-cover"
        />
      )}

      <div className={`flex items-center justify-between ${featured ? 'mt-3!' : 'mt-2.5!'}`}>
        <div className="flex gap-5">
          <button
            type="button"
            onClick={() => onLike(post)}
            aria-pressed={!!isLiked}
            aria-label={`Curtir · ${likesCount} curtida${likesCount === 1 ? '' : 's'}`}
            className={`flex min-h-11 items-center gap-1.5 text-sm ${isLiked ? 'font-bold' : 'font-semibold text-text-2'}`}
            style={isLiked ? { color: LIKE_PINK } : undefined}
          >
            <Heart
              size={20}
              strokeWidth={1.9}
              fill={isLiked ? 'currentColor' : 'none'}
              aria-hidden="true"
              className={popping ? 'animate-[dsPop_200ms_var(--spring)]' : ''}
              onAnimationEnd={onPopEnd}
            />
            {likesCount}
          </button>
          <button
            type="button"
            onClick={() => onShare(post)}
            className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-2"
          >
            <Share size={20} strokeWidth={1.9} aria-hidden="true" />
            Compartilhar
          </button>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir publicação"
            className="flex min-h-11 items-center gap-1 text-xs font-semibold text-text-3 transition-colors hover:text-err"
            title="Excluir publicação"
          >
            <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
            <span>Excluir</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [posts, setPosts] = useState(DEFAULT_FEED_POSTS);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'ORGANIZATION' | 'SPONSOR'
  const [userProfile, setUserProfile] = useState(() => getCachedUserProfile());
  const [likedPosts, setLikedPosts] = useState({});

  // Modal de Publicação
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null); // { url, type: 'image' | 'video' }
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isPublishing, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [popId, setPopId] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((p) => {
        if (p) setUserProfile(p);
      });
    }
    const handleProfileUpdate = () => {
      const p = getCachedUserProfile();
      if (p) setUserProfile(p);
    };
    window.addEventListener('facom_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('facom_profile_updated', handleProfileUpdate);
  }, [user?.uid]);

  // Escuta postagens em tempo real
  useEffect(() => {
    const unsub = subscribeToFeedPosts((list) => {
      setPosts(list);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const isAdminOrOrg = useMemo(() => {
    if (user?.email && isAdminEmail(user.email)) return true;
    const role = (userProfile?.role || userProfile?.userRole || '').toUpperCase();
    return role === 'ADMIN' || role === 'ORGANIZATION' || role === 'STAFF';
  }, [userProfile, user?.email]);

  const canCreatePost = useMemo(() => {
    if (!userProfile) return true; // Permite para testes/demonstração
    const role = (userProfile.role || userProfile.userRole || '').toUpperCase();
    return role === 'ADMIN' || role === 'ORGANIZATION' || role === 'SPONSOR' || isAdminOrOrg;
  }, [userProfile, isAdminOrOrg]);

  const isSponsor = useMemo(() => {
    const role = (userProfile?.role || userProfile?.userRole || '').toUpperCase();
    return role === 'SPONSOR';
  }, [userProfile]);

  const canDeletePost = (post) => {
    if (!user) return false;
    if (isAdminOrOrg) return true;
    const uid = user.uid;
    const isAuthor = (post.authorUid && post.authorUid === uid) || (post.authorId && post.authorId === uid);
    const userSponsorId = userProfile?.sponsorId || userProfile?.companyId;
    const postSponsorId = post.sponsorId || post.companyId;
    const isCompanyAuthor = isSponsor && userSponsorId && postSponsorId === userSponsorId;
    return Boolean(isAuthor || isCompanyAuthor);
  };

  const handleDeletePost = (post) => {
    setPostToDelete(post);
  };

  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    const post = postToDelete;
    setIsDeletingPost(true);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    try {
      await deleteFeedPost(post.id);
      setPostToDelete(null);
      setToast('Publicação excluída com sucesso.');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Erro ao excluir post:', err);
      setPostToDelete(null);
      setToast('Não foi possível excluir a publicação.');
      setTimeout(() => setToast(null), 3000);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('facom_feed_updated'));
      }
    } finally {
      setIsDeletingPost(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedFilter === 'ORGANIZATION') return p.authorRole === 'ORGANIZATION';
      if (selectedFilter === 'SPONSOR') return p.authorRole === 'SPONSOR';
      return true;
    });
  }, [posts, selectedFilter]);

  // "Publicação em destaque" (DESIGN.md §6): post fixado da organização; sem fixado, o mais recente dela.
  const featuredPost = useMemo(() => {
    if (selectedFilter === 'SPONSOR') return null;
    const org = filteredPosts.filter((p) => p.authorRole === 'ORGANIZATION');
    return org.find((p) => p.pinned) || org[0] || null;
  }, [filteredPosts, selectedFilter]);
  const timelinePosts = featuredPost ? filteredPosts.filter((p) => p !== featuredPost) : filteredPosts;

  const handleLike = (post) => {
    const postId = post.id;
    const isCurrentlyLiked = likedPosts[postId] || (user?.uid && post.likes?.includes(user.uid));

    if (!isCurrentlyLiked) setPopId(postId);

    // Atualização otimista da UI
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !isCurrentlyLiked
    }));

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const currentLikes = Array.isArray(p.likes) ? p.likes : [];
          const updatedLikes = isCurrentlyLiked
            ? currentLikes.filter((id) => id !== (user?.uid || 'temp-id'))
            : [...currentLikes, user?.uid || 'temp-id'];
          return { ...p, likes: updatedLikes };
        }
        return p;
      })
    );

    if (user?.uid) {
      toggleLikeFeedPost(postId, user.uid);
    }
  };

  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: `FACOM TechWeek 2026 - ${post.author}`,
        text: post.content,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${post.author}: ${post.content}`);
      setToast('Link e mensagem copiados para a área de transferência!');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setToast('Selecione um arquivo de foto ou vídeo válido.');
      setTimeout(() => setToast(null), 3500);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedMediaFile(file);
    setMediaPreview({
      url: previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name
    });
    setNewPostImageUrl(''); // Limpa URL manual se escolheu arquivo
  };

  const handleRemoveMedia = () => {
    setSelectedMediaFile(null);
    if (mediaPreview?.url && mediaPreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      let finalMediaUrl = newPostImageUrl.trim();
      let finalMediaType = finalMediaUrl ? 'image' : '';

      // Upload do arquivo selecionado (foto ou vídeo)
      if (selectedMediaFile) {
        setIsUploadingMedia(true);
        const uploadRes = await uploadFeedMedia(selectedMediaFile);
        finalMediaUrl = uploadRes.url;
        finalMediaType = uploadRes.mediaType;
        setIsUploadingMedia(false);
      }

      const isSponsor = userProfile?.role === 'SPONSOR';
      const companyId = userProfile?.companyId || 'default';
      const sponsorSettings = isSponsor ? getSponsorSettings(companyId) : null;
      const feedProfile = sponsorSettings?.feedProfile || {};

      const finalAuthor = isSponsor
        ? (feedProfile.displayName?.trim() || userProfile?.companyName || userProfile?.displayName || 'Patrocinador Oficial')
        : (userProfile?.displayName || 'Organização FACOM');

      const finalHandle = isSponsor
        ? (feedProfile.handle?.trim() || (userProfile?.companyId ? `@${userProfile.companyId}` : undefined))
        : undefined;

      const finalAvatar = isSponsor
        ? (feedProfile.avatarUrl?.trim() || userProfile?.avatarUrl || userProfile?.photoURL || '')
        : (userProfile?.avatarUrl || userProfile?.photoURL || '');

      await createFeedPost({
        author: finalAuthor,
        authorHandle: finalHandle,
        authorRole: isSponsor ? 'SPONSOR' : 'ORGANIZATION',
        authorAvatar: finalAvatar,
        content: newPostContent.trim(),
        imageUrl: finalMediaType === 'image' ? finalMediaUrl : '',
        videoUrl: finalMediaType === 'video' ? finalMediaUrl : '',
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        pinned: false,
        sponsorTier: isSponsor ? (userProfile?.tier || 'GOLD') : undefined,
        companyId: isSponsor ? companyId : undefined,
      });

      setNewPostContent('');
      setNewPostImageUrl('');
      handleRemoveMedia();
      setIsNewPostOpen(false);
      setToast('Publicação enviada com sucesso para o Feed!');
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      console.error(err);
      setToast('Erro ao publicar: ' + (err.message || 'Tente novamente.'));
      setTimeout(() => setToast(null), 3500);
    } finally {
      setIsSubmitting(false);
      setIsUploadingMedia(false);
    }
  };

  const toastIsError = toast && /^(Erro|Selecione)/.test(toast);
  const iconBtn = 'flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface';

  return (
    <div className="page-container animate-fade-in mx-auto! max-w-[430px] px-0! pt-0!">
      <SymplaStickyBanner />

      {toast && (
        <div
          role={toastIsError ? 'alert' : 'status'}
          className="fixed bottom-24 left-1/2 z-[2100] flex w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-surface-selected px-4! py-3! text-sm font-semibold text-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${toastIsError ? 'bg-err/15 text-err' : 'bg-ok/15 text-ok'}`}
            aria-hidden="true"
          >
            {toastIsError ? <X size={15} /> : <CheckCircle2 size={15} />}
          </span>
          <span className="flex-1">{toast}</span>
        </div>
      )}

      <header className="grid grid-cols-[44px_1fr_44px] items-center px-3 pt-[max(18px,env(safe-area-inset-top))]">
        {isAdminOrOrg ? (
          <button type="button" onClick={() => navigate('/admin')} aria-label="Painel do organizador" className={iconBtn}>
            <ShieldCheck size={20} aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
        <h1 className="screen-title mb-0!">Feed</h1>
        {canCreatePost ? (
          <button type="button" onClick={() => setIsNewPostOpen(true)} aria-label="Publicar no Feed" className={iconBtn}>
            <Plus size={22} aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
      </header>

      <div role="tablist" aria-label="Filtro" className="no-scrollbar flex gap-2 overflow-x-auto px-5! pt-6!">
        {FILTERS.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedFilter(tab.id)}
              className={`press h-11 shrink-0 whitespace-nowrap rounded-full px-4! text-[13px] transition-colors duration-150 ${
                isActive ? 'bg-action font-bold text-white' : 'border border-line-2 font-semibold text-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 px-5! pt-4!">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center px-4! pt-10! text-center">
            <Mascot color="purple" style={{ width: 120, height: 120 }} />
            <p className="mt-4! text-[15px] font-semibold text-text">
              {EMPTY_TEXT[selectedFilter]}
            </p>
            <p className="mt-1! text-[13px] text-text-2">Os avisos do evento e dos estandes aparecem aqui assim que saírem.</p>
            {selectedFilter !== 'ALL' && (
              <button type="button" onClick={() => setSelectedFilter('ALL')} className="btn btn-secondary btn-sm mt-5!">
                Ver todas as publicações
              </button>
            )}
          </div>
        ) : (
          [featuredPost, ...timelinePosts].filter(Boolean).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              featured={post === featuredPost}
              isLiked={likedPosts[post.id] || (user?.uid && post.likes?.includes(user.uid))}
              popping={popId === post.id}
              onLike={handleLike}
              onPopEnd={() => setPopId(null)}
              onShare={handleShare}
              canDelete={canDeletePost(post)}
              onDelete={() => handleDeletePost(post)}
            />
          ))
        )}
      </div>

      {isNewPostOpen && createPortal(
        <>
          <div className="ds-scrim" onClick={() => setIsNewPostOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="feed-new-post-title" className="ds-sheet">
            <div className="mb-4! flex items-center justify-between">
              <h2 id="feed-new-post-title" className="text-lg font-extrabold text-text">Publicar no Feed</h2>
              <button type="button" onClick={() => setIsNewPostOpen(false)} aria-label="Fechar" className={iconBtn}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              <div>
                <label htmlFor="feed-new-post-content" className="field-label">Mensagem</label>
                <textarea
                  id="feed-new-post-content"
                  required
                  rows={4}
                  placeholder="Escreva novidades do evento ou do seu estande..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="field resize-none py-3!"
                />
              </div>

              <div>
                <span className="field-label">Foto ou vídeo (opcional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!mediaPreview ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      <ImageIcon size={16} aria-hidden="true" />
                      Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      <Film size={16} aria-hidden="true" />
                      Vídeo
                    </button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[14px] bg-surface-raised">
                    {mediaPreview.type === 'video' ? (
                      <video controls src={mediaPreview.url} className="block max-h-[180px] w-full" />
                    ) : (
                      <img src={mediaPreview.url} alt="Prévia do anexo" className="block max-h-[180px] w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      aria-label="Remover anexo"
                      className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/70 text-text"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {!mediaPreview && (
                <div>
                  <label htmlFor="feed-new-post-url" className="field-label">Ou link de uma imagem</label>
                  <input
                    id="feed-new-post-url"
                    type="url"
                    placeholder="https://exemplo.com/banner.jpg"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="field"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isPublishing || isUploadingMedia || !newPostContent.trim()}
                className="btn btn-primary btn-block mt-1!"
              >
                {isPublishing || isUploadingMedia ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    {isUploadingMedia ? 'Enviando mídia...' : 'Publicando...'}
                  </>
                ) : (
                  <>
                    <Send size={18} aria-hidden="true" />
                    Publicar
                  </>
                )}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {postToDelete && (
        <ConfirmModal
          isOpen={Boolean(postToDelete)}
          title="Excluir publicação?"
          message="Essa publicação será removida do Feed imediatamente e não poderá ser recuperada."
          confirmLabel="Excluir publicação"
          cancelLabel="Cancelar"
          variant="danger"
          Icon={Trash2}
          isLoading={isDeletingPost}
          onConfirm={handleConfirmDeletePost}
          onCancel={() => !isDeletingPost && setPostToDelete(null)}
        />
      )}
    </div>
  );
}
