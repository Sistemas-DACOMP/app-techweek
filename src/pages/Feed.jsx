import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Heart, 
  Share2, 
  Pin, 
  Send, 
  Plus, 
  Image as ImageIcon, 
  Video as VideoIcon,
  X, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  ArrowLeft,
  Search,
  MessageSquare,
  UploadCloud,
  Loader2,
  ShieldCheck,
  Film
} from 'lucide-react';
import { subscribeToFeedPosts, createFeedPost, toggleLikeFeedPost, uploadFeedMedia, DEFAULT_FEED_POSTS } from '../lib/feedService';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, getCachedUserProfile } from '../lib/userService';
import logoTw from '../assets/logo-tw.png';

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
    const role = userProfile?.role || userProfile?.userRole || '';
    const email = (userProfile?.email || user?.email || '').toLowerCase();
    return role === 'ADMIN' || role === 'ORGANIZATION' || email === 'admin@admin.com' || email === 'sam03amorim@gmail.com';
  }, [userProfile, user]);

  const canCreatePost = useMemo(() => {
    if (!userProfile) return true; // Permite para testes/demonstração
    const role = userProfile.role || userProfile.userRole || '';
    return role === 'ADMIN' || role === 'ORGANIZATION' || role === 'SPONSOR' || isAdminOrOrg;
  }, [userProfile, isAdminOrOrg]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedFilter === 'ORGANIZATION') return p.authorRole === 'ORGANIZATION';
      if (selectedFilter === 'SPONSOR') return p.authorRole === 'SPONSOR';
      return true;
    });
  }, [posts, selectedFilter]);

  const handleLike = (post) => {
    const postId = post.id;
    const isCurrentlyLiked = likedPosts[postId] || (user?.uid && post.likes?.includes(user.uid));

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
      alert('Selecione um arquivo de foto ou vídeo válido.');
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
      await createFeedPost({
        author: userProfile?.companyName || userProfile?.displayName || (isSponsor ? 'Patrocinador Oficial' : 'Organização FACOM'),
        authorRole: isSponsor ? 'SPONSOR' : 'ORGANIZATION',
        authorAvatar: userProfile?.avatarUrl || userProfile?.photoURL || '',
        content: newPostContent.trim(),
        imageUrl: finalMediaType === 'image' ? finalMediaUrl : '',
        videoUrl: finalMediaType === 'video' ? finalMediaUrl : '',
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        pinned: false
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

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      {/* Toast Informativo */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#064E3B',
            border: '1px solid #10B981',
            color: '#A7F3D0',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header do Feed */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.15
            }}
          >
            Feed
          </h1>
          <p
            style={{
              fontSize: '0.80rem',
              color: '#94A3B8',
              margin: '3px 0 0',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            Comunicados oficiais, fotos e vídeos ao vivo
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdminOrOrg && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              title="Acessar Painel do Organizador"
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                borderRadius: '10px',
                padding: '8px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <ShieldCheck size={14} />
              <span>Admin</span>
            </button>
          )}

          {canCreatePost && (
            <button
              type="button"
              onClick={() => setIsNewPostOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                border: '1px solid #38BDF8',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
              }}
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>Publicar</span>
            </button>
          )}
        </div>
      </header>

      {/* Chips de Filtro */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}
        className="no-scrollbar"
      >
        {[
          { id: 'ALL', label: 'Todos os Posts' },
          { id: 'ORGANIZATION', label: 'Organização' },
          { id: 'SPONSOR', label: 'Patrocinadores' }
        ].map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '7px 14px',
                borderRadius: '999px',
                backgroundColor: isActive ? '#2563EB' : '#0F141F',
                border: isActive ? '1px solid #2563EB' : '1px solid #1E293B',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 10px rgba(37, 99, 235, 0.3)' : 'none'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feed Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredPosts.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#0F141F',
              borderRadius: '16px',
              border: '1px solid #1E293B',
              color: '#94A3B8'
            }}
          >
            <MessageSquare size={32} color="#38BDF8" style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Nenhuma publicação nesta categoria ainda.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isOrg = post.authorRole === 'ORGANIZATION';
            const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
            const isLiked = likedPosts[post.id] || (user?.uid && post.likes?.includes(user.uid));
            const hasVideo = post.videoUrl || (post.mediaType === 'video' && post.mediaUrl);
            const hasImage = post.imageUrl || (post.mediaType === 'image' && post.mediaUrl) || (!hasVideo && post.mediaUrl);

            return (
              <article
                key={post.id}
                style={{
                  backgroundColor: '#0F141F',
                  border: post.pinned ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid #1E293B',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: post.pinned ? '0 0 20px rgba(56, 189, 248, 0.15)' : '0 4px 16px rgba(0, 0, 0, 0.4)',
                  position: 'relative'
                }}
              >
                {/* Badge de Pinned se for post fixado */}
                {post.pinned && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#38BDF8',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      fontFamily: "'Inter', system-ui, sans-serif"
                    }}
                  >
                    <Pin size={11} strokeWidth={2} />
                    <span>PUBLICAÇÃO EM DESTAQUE</span>
                  </div>
                )}

                {/* Cabeçalho do Post */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Avatar do Autor */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: '#07090E',
                        border: isOrg ? '1px solid #38BDF8' : '1px solid #10B981',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isOrg ? (
                        <img src={logoTw} alt="" style={{ width: '70%', height: 'auto' }} />
                      ) : (
                        <Building2 size={20} color="#10B981" />
                      )}
                    </div>

                    {/* Nome e Tag do Autor */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3
                          style={{
                            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            color: '#F8FAFC',
                            margin: 0
                          }}
                        >
                          {post.author}
                        </h3>
                        {isOrg ? (
                          <CheckCircle2 size={14} color="#38BDF8" strokeWidth={2.2} />
                        ) : (
                          <span
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              color: '#6EE7B7',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}
                          >
                            ESTANDE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {post.formattedTime || 'Recente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conteúdo em Texto */}
                <p
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.86rem',
                    lineHeight: '1.5',
                    color: '#E2E8F0',
                    margin: '0 0 12px 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {post.content}
                </p>

                {/* MÍDIA: VÍDEO ANEXADO */}
                {hasVideo && (
                  <div
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      border: '1px solid #1E293B',
                      backgroundColor: '#07090E',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                    }}
                  >
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={post.videoUrl || post.mediaUrl}
                      style={{ width: '100%', maxHeight: '380px', display: 'block', backgroundColor: '#000000' }}
                    />
                  </div>
                )}

                {/* MÍDIA: IMAGEM ANEXADA */}
                {!hasVideo && hasImage && (
                  <div
                    style={{
                      width: '100%',
                      maxHeight: '300px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      border: '1px solid #1E293B',
                      backgroundColor: '#07090E'
                    }}
                  >
                    <img
                      src={post.imageUrl || post.mediaUrl}
                      alt="Anexo da publicação"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* Rodapé de Ações: Curtir e Compartilhar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(30, 41, 59, 0.6)',
                    marginTop: '8px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleLike(post)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isLiked ? '#EF4444' : '#94A3B8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Heart size={16} fill={isLiked ? '#EF4444' : 'none'} color={isLiked ? '#EF4444' : '#94A3B8'} />
                    <span>{likesCount > 0 ? likesCount : 'Curtir'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(post)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}
                  >
                    <Share2 size={15} />
                    <span>Compartilhar</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal de Nova Publicação com Upload de Foto & Vídeo */}
      {isNewPostOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 9, 14, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Publicar no Feed
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPostOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                  Mensagem / Comunicado *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva novidades do evento ou do seu estande..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    color: '#F8FAFC',
                    fontSize: '0.84rem',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Botões de Upload de Foto e Vídeo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                  Anexar Foto ou Vídeo
                </label>

                {/* Input escondido */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {!mediaPreview ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                        color: '#38BDF8',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <ImageIcon size={15} />
                      <span>Anexar Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'video/*';
                          fileInputRef.current.click();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(192, 132, 252, 0.3)',
                        backgroundColor: 'rgba(192, 132, 252, 0.08)',
                        color: '#C084FC',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Film size={15} />
                      <span>Anexar Vídeo</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1E293B', backgroundColor: '#07090E', padding: '6px' }}>
                    {mediaPreview.type === 'video' ? (
                      <video
                        controls
                        src={mediaPreview.url}
                        style={{ width: '100%', maxHeight: '180px', borderRadius: '6px', display: 'block' }}
                      />
                    ) : (
                      <img
                        src={mediaPreview.url}
                        alt="Preview"
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        border: '1px solid #EF4444',
                        color: '#EF4444',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* URL externa de fallback */}
              {!mediaPreview && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', marginBottom: '4px' }}>
                    Ou insira URL de imagem:
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/banner.jpg"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#07090E',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#F8FAFC',
                      fontSize: '0.80rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewPostOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#1E293B',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishing || isUploadingMedia || !newPostContent.trim()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isPublishing || isUploadingMedia ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{isUploadingMedia ? 'Enviando mídia...' : 'Publicando...'}</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Publicar Agora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
