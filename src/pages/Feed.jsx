import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Heart, 
  Share2, 
  Pin, 
  Send, 
  Plus, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  ArrowLeft,
  Search,
  MessageSquare
} from 'lucide-react';
import { subscribeToFeedPosts, createFeedPost, toggleLikeFeedPost, DEFAULT_FEED_POSTS } from '../lib/feedService';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../lib/userService';
import logoTw from '../assets/logo-tw.png';

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState(DEFAULT_FEED_POSTS);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'ORGANIZATION' | 'SPONSOR'
  const [userProfile, setUserProfile] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});

  // Modal de Publicação
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [isPublishing, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((p) => {
        if (p) setUserProfile(p);
      });
    }
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

  const canCreatePost = useMemo(() => {
    if (!userProfile) return true; // Permite para testes/demonstração
    const role = userProfile.role || userProfile.userRole || '';
    return role === 'ADMIN' || role === 'ORGANIZATION' || role === 'SPONSOR';
  }, [userProfile]);

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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const isSponsor = userProfile?.role === 'SPONSOR';
      await createFeedPost({
        author: userProfile?.companyName || userProfile?.displayName || (isSponsor ? 'Patrocinador Oficial' : 'Organização FACOM'),
        authorRole: isSponsor ? 'SPONSOR' : 'ORGANIZATION',
        authorAvatar: userProfile?.avatarUrl || userProfile?.photoURL || '',
        content: newPostContent.trim(),
        imageUrl: newPostImageUrl.trim(),
        pinned: false
      });

      setNewPostContent('');
      setNewPostImageUrl('');
      setIsNewPostOpen(false);
      setToast('Publicação enviada com sucesso para o Feed!');
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast('Erro ao publicar post. Tente novamente.');
      setTimeout(() => setToast(null), 3500);
    } finally {
      setIsSubmitting(false);
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
          marginBottom: '22px'
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
            Comunicados oficiais e novidades ao vivo
          </p>
        </div>

        {canCreatePost && (
          <button
            type="button"
            onClick={() => setIsNewPostOpen(true)}
            style={{
              backgroundColor: '#2563EB',
              border: '1px solid #3B82F6',
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
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Publicar</span>
          </button>
        )}
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
                border: isActive ? '1px solid #3B82F6' : '1px solid #1E293B',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
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
            <MessageSquare size={32} color="#3B82F6" style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Nenhuma publicação nesta categoria ainda.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isOrg = post.authorRole === 'ORGANIZATION';
            const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
            const isLiked = likedPosts[post.id] || (user?.uid && post.likes?.includes(user.uid));

            return (
              <article
                key={post.id}
                style={{
                  backgroundColor: '#0F141F',
                  border: post.pinned ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid #1E293B',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
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
                      color: '#60A5FA',
                      backgroundColor: 'rgba(37, 99, 235, 0.15)',
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
                        border: isOrg ? '1px solid #3B82F6' : '1px solid #10B981',
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
                          <CheckCircle2 size={14} color="#3B82F6" strokeWidth={2.2} />
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

                {/* Imagem Anexada */}
                {post.imageUrl && (
                  <div
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      border: '1px solid #1E293B',
                      backgroundColor: '#07090E'
                    }}
                  >
                    <img
                      src={post.imageUrl}
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

      {/* Modal de Nova Publicação */}
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
              maxWidth: '430px',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
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
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                  URL da Imagem (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://suaimagem.com/foto.jpg"
                  value={newPostImageUrl}
                  onChange={(e) => setNewPostImageUrl(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#F8FAFC',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
                  disabled={isPublishing || !newPostContent.trim()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
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
                  <Send size={15} />
                  <span>{isPublishing ? 'Publicando...' : 'Publicar Agora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
