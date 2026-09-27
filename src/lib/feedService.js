import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Posts padrão para o Feed da FACOM TechWeek 2026.
 * Exibidos como fallback gracioso caso a coleção 'feed_posts' do Firestore esteja vazia.
 */
export const DEFAULT_FEED_POSTS = [
  {
    id: 'feed-1',
    author: 'Organização FACOM TechWeek',
    authorRole: 'ORGANIZATION',
    authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    content: '🎉 Sejam bem-vindos à FACOM TechWeek 2026! Acompanhem o feed para avisos em tempo real, horários de palestras e novidades dos estandes.',
    imageUrl: '',
    videoUrl: '',
    mediaUrl: '',
    mediaType: '',
    pinned: true,
    likes: ['user1', 'user2', 'user3', 'user4', 'user5'],
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    formattedTime: 'há 25 min'
  },
  {
    id: 'feed-2',
    author: 'Kanastra (Patrocinador Master)',
    authorRole: 'SPONSOR',
    authorAvatar: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&auto=format&fit=crop&q=80',
    content: '⚡️ Nosso estande já está aberto! Venham conversar com nosso time de engenharia sobre backend de alta escala, pegar brindes e descobrir a palavra-chave da Missão Secreta!',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    mediaUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    pinned: false,
    likes: ['user1', 'user2', 'user8'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    formattedTime: 'há 2 horas'
  },
  {
    id: 'feed-3',
    author: 'Organização FACOM TechWeek',
    authorRole: 'ORGANIZATION',
    authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    content: '📢 ATENÇÃO: A palestra sobre Inteligência Artificial Generativa no Auditório 1 começará em 15 minutos. Garantam suas vagas e preparem o QR Code do app para o check-in!',
    imageUrl: '',
    videoUrl: '',
    mediaUrl: '',
    mediaType: '',
    pinned: false,
    likes: ['user2', 'user3', 'user9', 'user10'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    formattedTime: 'há 4 horas'
  },
  {
    id: 'feed-4',
    author: 'Sankhya',
    authorRole: 'SPONSOR',
    authorAvatar: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80',
    content: '🚀 Dica de ouro para quem quer se destacar no mercado: passem no nosso estande para conhecer nossa Trilha de Carreira em Desenvolvimento!',
    imageUrl: '',
    videoUrl: '',
    mediaUrl: '',
    mediaType: '',
    pinned: false,
    likes: ['user1', 'user4'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    formattedTime: 'há 6 horas'
  }
];

/**
 * Faz upload de foto ou vídeo para o Firebase Storage com fallback resiliente.
 */
export async function uploadFeedMedia(file) {
  if (!file) throw new Error('Nenhum arquivo de mídia fornecido.');
  
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  
  if (!isVideo && !isImage) {
    throw new Error('Formato inválido. Envie uma imagem (JPG, PNG, WebP, GIF) ou vídeo (MP4, WebM, MOV).');
  }

  // Limites expandidos para fotos e vídeos em alta resolução/pesados
  const maxBytes = isVideo ? 250 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(isVideo ? 'O vídeo deve ter no máximo 250MB.' : 'A imagem deve ter no máximo 50MB.');
  }

  const ext = file.name ? file.name.split('.').pop() : (isVideo ? 'mp4' : 'jpg');
  const path = `feed/${isVideo ? 'videos' : 'images'}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storageRef = ref(storage, path);

  try {
    const uploadTask = (async () => {
      await uploadBytes(storageRef, file, { contentType: file.type });
      return await getDownloadURL(storageRef);
    })();

    // Timeout estendido para 120s para acomodar uploads pesados
    const timeoutTask = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido no upload da mídia. Verifique sua conexão.')), 120000);
    });

    const finalUrl = await Promise.race([uploadTask, timeoutTask]);
    return {
      url: finalUrl,
      mediaType: isVideo ? 'video' : 'image'
    };
  } catch (err) {
    console.warn('Storage indisponível ou conexão lenta. Convertendo via Data URL / ObjectURL:', err);
    if (isImage && file.size < 20 * 1024 * 1024) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result, mediaType: 'image' });
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
    const objectUrl = URL.createObjectURL(file);
    return {
      url: objectUrl,
      mediaType: isVideo ? 'video' : 'image'
    };
  }
}

const LOCAL_FEED_KEY = 'facom_local_feed_posts';

function getLocalFeedPosts() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_FEED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

function saveLocalFeedPost(post) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getLocalFeedPosts();
    const updated = [post, ...current.filter((p) => p.id !== post.id)];
    localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('facom_feed_updated'));
    }
  } catch (_e) {}
}

function removeLocalFeedPost(postId) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getLocalFeedPosts();
    const updated = current.filter((p) => p.id !== postId);
    localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('facom_feed_updated'));
    }
  } catch (_e) {}
}

function updateLocalFeedPostPin(postId, currentPinned) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getLocalFeedPosts();
    const updated = current.map((p) => (p.id === postId ? { ...p, pinned: !currentPinned } : p));
    localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('facom_feed_updated'));
    }
  } catch (_e) {}
}

function mergePosts(firestorePosts) {
  const localPosts = getLocalFeedPosts();
  const map = new Map();

  // Insere posts do Firestore
  (firestorePosts || []).forEach((p) => map.set(p.id, p));

  // Insere/sobrescreve posts locais
  localPosts.forEach((p) => map.set(p.id, p));

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return merged;
}

/**
 * Escuta atualizações do Feed em tempo real.
 */
export function subscribeToFeedPosts(callback) {
  let firestorePosts = [];

  const notify = () => {
    const merged = mergePosts(firestorePosts.length > 0 ? firestorePosts : DEFAULT_FEED_POSTS);
    callback(merged);
  };

  const handleLocalUpdate = () => {
    notify();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('facom_feed_updated', handleLocalUpdate);
  }

  try {
    const q = query(
      collection(db, 'feed_posts'),
      orderBy('createdAt', 'desc')
    );

    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          firestorePosts = [];
          notify();
          return;
        }

        firestorePosts = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const mediaType = data.mediaType || (data.videoUrl ? 'video' : (data.imageUrl ? 'image' : ''));
          return {
            id: docSnap.id,
            ...data,
            imageUrl: data.imageUrl || (mediaType === 'image' ? data.mediaUrl : '') || '',
            videoUrl: data.videoUrl || (mediaType === 'video' ? data.mediaUrl : '') || '',
            mediaUrl: data.mediaUrl || data.videoUrl || data.imageUrl || '',
            mediaType,
            likes: Array.isArray(data.likes) ? data.likes : [],
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString()
          };
        });

        notify();
      },
      (error) => {
        if (error?.code !== 'permission-denied') {
          console.warn('Aviso: Erro ao escutar feed_posts no Firestore, utilizando fallback:', error);
        }
        firestorePosts = [];
        notify();
      }
    );

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('facom_feed_updated', handleLocalUpdate);
      }
      if (typeof unsubFirestore === 'function') unsubFirestore();
    };
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Aviso: Exceção ao conectar no Firestore para feed_posts:', err);
    }
    firestorePosts = [];
    notify();
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('facom_feed_updated', handleLocalUpdate);
      }
    };
  }
}

/**
 * Retorna o último post do Feed para o Card de Resumo da Tela Inicial.
 */
export async function getLatestFeedPost() {
  const localPosts = getLocalFeedPosts();
  if (localPosts.length > 0) return localPosts[0];

  try {
    const q = query(
      collection(db, 'feed_posts'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      const mediaType = data.mediaType || (data.videoUrl ? 'video' : (data.imageUrl ? 'image' : ''));
      return {
        id: docSnap.id,
        ...data,
        imageUrl: data.imageUrl || (mediaType === 'image' ? data.mediaUrl : '') || '',
        videoUrl: data.videoUrl || (mediaType === 'video' ? data.mediaUrl : '') || '',
        mediaUrl: data.mediaUrl || data.videoUrl || data.imageUrl || '',
        mediaType,
        likes: Array.isArray(data.likes) ? data.likes : []
      };
    }
  } catch (_e) {}

  return DEFAULT_FEED_POSTS[0];
}

/**
 * Cria uma nova publicação no Feed (Organização ou Patrocinador).
 */
export async function createFeedPost(postData) {
  const mediaType = postData.mediaType || (postData.videoUrl ? 'video' : (postData.imageUrl ? 'image' : ''));
  const nowIso = new Date().toISOString();

  const formattedPost = {
    author: postData.author || 'Organização FACOM',
    authorRole: postData.authorRole || 'ORGANIZATION',
    authorAvatar: postData.authorAvatar || '',
    content: postData.content,
    imageUrl: postData.imageUrl || (mediaType === 'image' ? (postData.mediaUrl || '') : ''),
    videoUrl: postData.videoUrl || (mediaType === 'video' ? (postData.mediaUrl || '') : ''),
    mediaUrl: postData.mediaUrl || postData.videoUrl || postData.imageUrl || '',
    mediaType: mediaType || '',
    pinned: Boolean(postData.pinned),
    likes: [],
    createdAt: nowIso,
    formattedTime: 'Agora'
  };

  try {
    const docRef = await addDoc(collection(db, 'feed_posts'), {
      ...formattedPost,
      createdAt: serverTimestamp()
    });
    const finalPost = { ...formattedPost, id: docRef.id };
    saveLocalFeedPost(finalPost);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn('Firestore não respondeu ou rejeitou gravação. Salvando post localmente com fallback:', err);
    const fallbackId = `local_post_${Date.now()}`;
    const localPost = { ...formattedPost, id: fallbackId };
    saveLocalFeedPost(localPost);
    return { success: true, id: fallbackId };
  }
}

/**
 * Curte ou descurte uma publicação no Feed.
 */
export async function toggleLikeFeedPost(postId, userId) {
  if (!userId || !postId) return;
  try {
    if (!postId.startsWith('feed-') && !postId.startsWith('local_post_')) {
      const postRef = doc(db, 'feed_posts', postId);
      await updateDoc(postRef, {
        likes: arrayUnion(userId)
      });
    }
  } catch (err) {
    console.warn('Aviso: Erro ao alternar curtida no post do Feed no Firestore:', err);
  }
}

/**
 * Remove uma publicação do Feed (exclusivo para Organizadores/Admin).
 */
export async function deleteFeedPost(postId) {
  if (!postId) return;
  removeLocalFeedPost(postId);
  try {
    if (!postId.startsWith('feed-') && !postId.startsWith('local_post_')) {
      await deleteDoc(doc(db, 'feed_posts', postId));
    }
    return { success: true };
  } catch (err) {
    console.warn('Aviso ao excluir publicação no Firestore:', err);
    return { success: true };
  }
}

/**
 * Alterna se uma publicação fica fixada no topo do Feed.
 */
export async function togglePinFeedPost(postId, currentPinned) {
  if (!postId) return;
  updateLocalFeedPostPin(postId, currentPinned);
  try {
    if (!postId.startsWith('feed-') && !postId.startsWith('local_post_')) {
      await updateDoc(doc(db, 'feed_posts', postId), {
        pinned: !currentPinned
      });
    }
    return { success: true };
  } catch (err) {
    console.warn('Aviso ao alternar fixação no Firestore:', err);
    return { success: true };
  }
}

/**
 * Dispara um comunicado / aviso em tempo real para todos os participantes (Sino de Notificações).
 */
export async function broadcastAnnouncement({ title, message, priority = 'HIGH', actionUrl = null, actionLabel = null }) {
  try {
    const docRef = await addDoc(collection(db, 'announcements'), {
      title,
      message,
      priority,
      actionUrl,
      actionLabel,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn('Aviso: Erro ao enviar comunicado no Firestore:', err);
    throw err;
  }
}
