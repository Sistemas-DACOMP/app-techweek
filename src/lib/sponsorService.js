import { auth, db } from './firebase';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { verifySymplaTicket, verifySymplaDirectly, getCachedSymplaByCode } from './sympla';

const getApiBaseUrl = () => {
  return import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || '/api';
};

/**
 * Resolve os dados do participante a partir da leitura do QR Code do crachá
 * (físico Sympla, crachá digital do app ou UID direto).
 * 
 * @param {string} rawData Conteúdo lido pelo scanner
 * @returns {Promise<object|null>} Dados essenciais do participante
 */
export async function resolveParticipantFromQr(rawData) {
  if (!rawData || typeof rawData !== 'string') return null;

  const trimmed = rawData.trim();
  if (!trimmed) return null;

  let decodedText = trimmed;
  try {
    decodedText = decodeURIComponent(trimmed);
  } catch {}

  // 1. Tenta interpretar como JSON (crachá digital do app)
  let parsedJson = null;
  try {
    if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
      parsedJson = JSON.parse(decodedText);
    }
  } catch {
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsedJson = JSON.parse(trimmed);
      }
    } catch {}
  }

  // Helper para consultar o diretório local de perfis salvo no navegador
  const lookupLocalDirectoryProfile = (uid, email) => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const merged = {};
      let found = false;
      const cleanEmail = (email || '').trim().toLowerCase();
      const keys = [];
      if (uid) {
        keys.push(`facom_profile_${uid}`, `facom_user_dir_${uid}`, `facom_user_profile_${uid}`);
      }
      if (cleanEmail) {
        keys.push(`facom_user_dir_email_${cleanEmail}`);
      }
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            Object.assign(merged, parsed);
            found = true;
          }
        }
      }
      return found ? merged : null;
    } catch {
      return null;
    }
  };

  const hasRealParticipantName = (d) => {
    if (!d || typeof d !== 'object') return false;
    const p = d.participant && typeof d.participant === 'object' ? d.participant : {};
    const fn = (d.firstName || d.first_name || p.firstName || p.first_name || '').trim();
    const ln = (d.lastName || d.last_name || p.lastName || p.last_name || '').trim();
    const dn = (d.displayName || d.name || p.displayName || p.name || '').trim();
    if (fn && fn.toLowerCase() !== 'participante') return true;
    if (ln) return true;
    if (dn && dn.toLowerCase() !== 'participante' && !dn.startsWith('Participante #')) return true;
    return false;
  };

  // Se o JSON contiver UID direto
  if (parsedJson?.uid || parsedJson?.participantUid) {
    const targetUid = parsedJson.uid || parsedJson.participantUid;
    const localDir = lookupLocalDirectoryProfile(targetUid, parsedJson?.email);
    try {
      const publicDoc = await getDoc(doc(db, 'public_profiles', targetUid));
      if (publicDoc?.exists()) {
        return formatParticipant(publicDoc.id, { ...(localDir || {}), ...publicDoc.data() }, parsedJson);
      }
    } catch {}
    try {
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc?.exists()) {
        return formatParticipant(userDoc.id, { ...(localDir || {}), ...userDoc.data() }, parsedJson);
      }
    } catch {}
    if (localDir && hasRealParticipantName(localDir)) {
      return formatParticipant(targetUid, localDir, parsedJson);
    }
  }

  // Se contiver email no JSON
  if (parsedJson?.email) {
    const cleanEmail = String(parsedJson.email).trim().toLowerCase();
    const localDir = lookupLocalDirectoryProfile(parsedJson?.uid, cleanEmail);
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() }, parsedJson);
      }
    } catch {}
    if (localDir && hasRealParticipantName(localDir)) {
      return formatParticipant(localDir.uid || cleanEmail, localDir, parsedJson);
    }
  }

  // Se contiver username no JSON
  if (parsedJson?.username) {
    const username = String(parsedJson.username).replace(/^@/, '').toLowerCase().trim();
    try {
      const q = query(collection(db, 'public_profiles'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        const localDir = lookupLocalDirectoryProfile(docSnap.id, docSnap.data()?.email);
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() }, parsedJson);
      }
    } catch {}
    try {
      const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        const localDir = lookupLocalDirectoryProfile(docSnap.id, docSnap.data()?.email);
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() }, parsedJson);
      }
    } catch {}
  }

  // 2. Se o dado lido for um e-mail (ex: erick.raposo@ufu.br ou mailto:erick.raposo@ufu.br)
  const emailCandidate = decodedText.replace(/^mailto:/i, '').trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate);
  if (isEmail) {
    const localDir = lookupLocalDirectoryProfile(null, emailCandidate);
    try {
      const q = query(collection(db, 'users'), where('email', '==', emailCandidate.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() }, parsedJson);
      }
      const qExact = query(collection(db, 'users'), where('email', '==', emailCandidate), limit(1));
      const snapExact = await getDocs(qExact);
      if (snapExact && !snapExact.empty) {
        const docSnap = snapExact.docs[0];
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() }, parsedJson);
      }
    } catch {}

    if (localDir && hasRealParticipantName(localDir)) {
      return formatParticipant(localDir.uid || emailCandidate, localDir, parsedJson);
    }

    // Fallback gracioso com os dados inferidos do e-mail para não bloquear a operação
    const namePart = emailCandidate.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      participantUid: emailCandidate,
      name: namePart || 'Participante',
      username: emailCandidate.split('@')[0],
      firstName: namePart.split(' ')[0] || 'Participante',
      course: 'Computação',
      period: null,
      institution: '',
      phone: '',
      email: emailCandidate,
      linkedin: '',
      instagram: '',
      github: '',
      participantType: 'Estudante',
      avatarUrl: null
    };
  }

  // 3. Se o dado lido for diretamente um ID de documento do Firestore (UID)
  if (!parsedJson && /^[a-zA-Z0-9_-]{15,40}$/.test(trimmed)) {
    const localDir = lookupLocalDirectoryProfile(trimmed, null);
    try {
      const publicDoc = await getDoc(doc(db, 'public_profiles', trimmed));
      if (publicDoc?.exists()) {
        return formatParticipant(publicDoc.id, { ...(localDir || {}), ...publicDoc.data() });
      }
    } catch {}
    try {
      const directDoc = await getDoc(doc(db, 'users', trimmed));
      if (directDoc?.exists()) {
        return formatParticipant(directDoc.id, { ...(localDir || {}), ...directDoc.data() });
      }
    } catch {}
    if (localDir && hasRealParticipantName(localDir)) {
      return formatParticipant(trimmed, localDir);
    }
  }

  // 4. Se for username direto (ex: @erickraposo ou erickraposo)
  if (!parsedJson && /^@?[a-zA-Z0-9_.-]{3,30}$/.test(trimmed) && !trimmed.includes(' ')) {
    const cleanUsername = trimmed.replace(/^@/, '').toLowerCase();
    try {
      const q = query(collection(db, 'public_profiles'), where('username', '==', cleanUsername), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        const localDir = lookupLocalDirectoryProfile(docSnap.id, docSnap.data()?.email);
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() });
      }
    } catch {}
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
      const snap = await getDocs(q);
      if (snap && !snap.empty) {
        const docSnap = snap.docs[0];
        const localDir = lookupLocalDirectoryProfile(docSnap.id, docSnap.data()?.email);
        return formatParticipant(docSnap.id, { ...(localDir || {}), ...docSnap.data() });
      }
    } catch {}
  }

  // 5. Se contiver número/código de ingresso Sympla no JSON ou texto puro (com ou sem prefixo SYMPLA:)
  const rawTicketCandidate = parsedJson?.ticketNumber || (!parsedJson ? trimmed : null);
  const ticketNumber = rawTicketCandidate
    ? String(rawTicketCandidate).replace(/^SYMPLA:/i, '').trim()
    : null;

  if (ticketNumber && !ticketNumber.startsWith('QR_')) {
    const cleanAlphaNum = ticketNumber.toUpperCase().replace(/[-\s]/g, '');
    const candidates = Array.from(new Set([
      ticketNumber,
      ticketNumber.toUpperCase(),
      cleanAlphaNum,
      `SYMPLA:${ticketNumber.toUpperCase()}`,
      rawTicketCandidate.trim()
    ]));

    let partialUid = parsedJson?.uid || parsedJson?.participantUid || null;
    let partialData = { ...(parsedJson || {}) };

    const mergePartial = (uidCandidate, obj) => {
      if (uidCandidate && !partialUid) partialUid = uidCandidate;
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null && v !== '') {
          partialData[k] = v;
        }
      }
    };

    // 5a. Busca direta na collection symplaTickets/{ticketNumber}
    for (const candidate of [ticketNumber.toUpperCase(), ticketNumber, cleanAlphaNum]) {
      try {
        const ticketDoc = await getDoc(doc(db, 'symplaTickets', encodeURIComponent(candidate)));
        if (ticketDoc?.exists()) {
          const ticketData = ticketDoc.data();
          mergePartial(ticketData?.uid, ticketData);
          if (ticketData?.uid) {
            const localDir = lookupLocalDirectoryProfile(ticketData.uid, ticketData.email);
            mergePartial(ticketData.uid, localDir);
            try {
              const linkedPublicDoc = await getDoc(doc(db, 'public_profiles', ticketData.uid));
              if (linkedPublicDoc?.exists()) {
                mergePartial(linkedPublicDoc.id, linkedPublicDoc.data());
              }
            } catch {}
            try {
              const linkedUserDoc = await getDoc(doc(db, 'users', ticketData.uid));
              if (linkedUserDoc?.exists()) {
                mergePartial(linkedUserDoc.id, linkedUserDoc.data());
                const localDir2 = lookupLocalDirectoryProfile(linkedUserDoc.id, linkedUserDoc.data()?.email);
                mergePartial(linkedUserDoc.id, localDir2);
              }
            } catch {}
            if (hasRealParticipantName(partialData)) {
              return formatParticipant(ticketData.uid, partialData, parsedJson);
            }
          }
          if (ticketData?.email) {
            const cleanTicketEmail = String(ticketData.email).toLowerCase().trim();
            mergePartial(null, lookupLocalDirectoryProfile(ticketData?.uid, cleanTicketEmail));
            const qEmail = query(collection(db, 'users'), where('email', '==', cleanTicketEmail), limit(1));
            const snapEmail = await getDocs(qEmail);
            if (snapEmail && !snapEmail.empty) {
              mergePartial(snapEmail.docs[0].id, snapEmail.docs[0].data());
              if (hasRealParticipantName(partialData)) {
                return formatParticipant(snapEmail.docs[0].id, partialData, parsedJson);
              }
            }
          }
        }
      } catch {}
    }

    // 5b. Busca na collection users por ticketId, symplaTicket.ticketNumber ou symplaTicket.qrCodeData
    for (const candidate of candidates) {
      try {
        const q1 = query(collection(db, 'users'), where('ticketId', '==', candidate), limit(1));
        const snap1 = await getDocs(q1);
        if (snap1 && !snap1.empty) {
          const d = snap1.docs[0].data();
          mergePartial(snap1.docs[0].id, lookupLocalDirectoryProfile(snap1.docs[0].id, d?.email));
          mergePartial(snap1.docs[0].id, d);
          if (hasRealParticipantName(partialData)) {
            return formatParticipant(snap1.docs[0].id, partialData, parsedJson);
          }
        }

        const q2 = query(collection(db, 'users'), where('symplaTicket.ticketNumber', '==', candidate), limit(1));
        const snap2 = await getDocs(q2);
        if (snap2 && !snap2.empty) {
          const d = snap2.docs[0].data();
          mergePartial(snap2.docs[0].id, lookupLocalDirectoryProfile(snap2.docs[0].id, d?.email));
          mergePartial(snap2.docs[0].id, d);
          if (hasRealParticipantName(partialData)) {
            return formatParticipant(snap2.docs[0].id, partialData, parsedJson);
          }
        }

        const q3 = query(collection(db, 'users'), where('symplaTicket.qrCodeData', '==', candidate), limit(1));
        const snap3 = await getDocs(q3);
        if (snap3 && !snap3.empty) {
          const d = snap3.docs[0].data();
          mergePartial(snap3.docs[0].id, lookupLocalDirectoryProfile(snap3.docs[0].id, d?.email));
          mergePartial(snap3.docs[0].id, d);
          if (hasRealParticipantName(partialData)) {
            return formatParticipant(snap3.docs[0].id, partialData, parsedJson);
          }
        }
      } catch {}
    }

    // 5c. Verifica cache local de ingressos e perfis no dispositivo
    const cachedTicket = getCachedSymplaByCode(rawTicketCandidate);
    if (cachedTicket) {
      const cachedUid = cachedTicket.uid || partialUid;
      const cachedEmail = (cachedTicket.email || partialData.email || '').trim();
      if (cachedTicket.participant && typeof cachedTicket.participant === 'object') {
        mergePartial(cachedUid, cachedTicket.participant);
      }
      mergePartial(cachedUid, cachedTicket);
      mergePartial(cachedUid, lookupLocalDirectoryProfile(cachedUid, cachedEmail));

      if (cachedUid) {
        try {
          const pDoc = await getDoc(doc(db, 'public_profiles', cachedUid));
          if (pDoc?.exists()) {
            const pData = pDoc.data();
            mergePartial(pDoc.id, lookupLocalDirectoryProfile(pDoc.id, pData?.email || cachedEmail));
            mergePartial(pDoc.id, pData);
          }
        } catch {}
        try {
          const uDoc = await getDoc(doc(db, 'users', cachedUid));
          if (uDoc?.exists()) {
            const uData = uDoc.data();
            mergePartial(uDoc.id, lookupLocalDirectoryProfile(uDoc.id, uData?.email || cachedEmail));
            mergePartial(uDoc.id, uData);
          }
        } catch {}
      }

      if (cachedEmail) {
        try {
          const qEmail = query(collection(db, 'users'), where('email', '==', cachedEmail.toLowerCase()), limit(1));
          const snapEmail = await getDocs(qEmail);
          if (snapEmail && !snapEmail.empty) {
            const uData = snapEmail.docs[0].data();
            mergePartial(snapEmail.docs[0].id, lookupLocalDirectoryProfile(snapEmail.docs[0].id, cachedEmail));
            mergePartial(snapEmail.docs[0].id, uData);
          }
        } catch {}
      }

      // Só retorna imediatamente se já tivermos o nome real E dados de perfil (curso/username/telefone);
      // caso contrário, prossegue para 5d/5e para enriquecer com a API do Sympla e varredura do Firestore!
      const hasProfileDetails = Boolean(partialData.course || partialData.username || partialData.phone);
      if (hasRealParticipantName(partialData) && hasProfileDetails) {
        return formatParticipant(
          partialUid || cachedUid || cachedEmail || `sympla_${ticketNumber.toUpperCase()}`,
          partialData,
          parsedJson
        );
      }
    }

    // 5d. Consulta o ingresso no backend (/api/sympla/verify-ticket) com fallback direto na API do Sympla
    try {
      let symplaParticipant = null;
      const verifyPayload = {
        ticketNumber,
        ...(partialData.email ? { email: partialData.email } : {})
      };
      const backendResult = await verifySymplaTicket(verifyPayload).catch(() => null);
      if (backendResult?.participant || backendResult?.symplaTicket) {
        symplaParticipant = backendResult.participant || backendResult.symplaTicket;
        mergePartial(null, symplaParticipant);
      }
      if (backendResult?.userProfile && backendResult.userProfile.uid) {
        const up = backendResult.userProfile;
        mergePartial(up.uid, lookupLocalDirectoryProfile(up.uid, up.email));
        mergePartial(up.uid, up);
        if (hasRealParticipantName(partialData) && (partialData.course || partialData.username || partialData.phone)) {
          return formatParticipant(up.uid, partialData, { ...(symplaParticipant || {}), ...(parsedJson || {}) });
        }
      }
      if (!symplaParticipant) {
        const directResult = await verifySymplaDirectly(verifyPayload).catch(() => null);
        symplaParticipant = directResult?.participant || null;
        if (symplaParticipant) {
          mergePartial(null, symplaParticipant);
        }
      }

      const symplaEmail = (symplaParticipant?.email || partialData.email || '').trim();
      if (symplaEmail) {
        mergePartial(partialUid, lookupLocalDirectoryProfile(partialUid, symplaEmail));
        try {
          const qEmail = query(collection(db, 'users'), where('email', '==', symplaEmail.toLowerCase()), limit(1));
          const snapEmail = await getDocs(qEmail);
          if (snapEmail && !snapEmail.empty) {
            mergePartial(snapEmail.docs[0].id, lookupLocalDirectoryProfile(snapEmail.docs[0].id, symplaEmail));
            mergePartial(snapEmail.docs[0].id, snapEmail.docs[0].data());
            return formatParticipant(snapEmail.docs[0].id, partialData, { ...(symplaParticipant || {}), ...(parsedJson || {}) });
          }
          const qEmailExact = query(collection(db, 'users'), where('email', '==', symplaEmail), limit(1));
          const snapEmailExact = await getDocs(qEmailExact);
          if (snapEmailExact && !snapEmailExact.empty) {
            mergePartial(snapEmailExact.docs[0].id, lookupLocalDirectoryProfile(snapEmailExact.docs[0].id, symplaEmail));
            mergePartial(snapEmailExact.docs[0].id, snapEmailExact.docs[0].data());
            return formatParticipant(snapEmailExact.docs[0].id, partialData, { ...(symplaParticipant || {}), ...(parsedJson || {}) });
          }
        } catch {}
      }

      // 5e. Fallback resiliente na coleção users (caso e-mail tenha maiúsculas/minúsculas ou ticket esteja aninhado)
      try {
        const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(200)));
        if (allUsersSnap && Array.isArray(allUsersSnap.docs) && allUsersSnap.docs.length > 0) {
          const upperTicket = ticketNumber.toUpperCase();
          const lowerEmail = symplaEmail.toLowerCase();
          const matchedDoc = allUsersSnap.docs.find((d) => {
            if (partialUid && d.id === partialUid) return true;
            const u = typeof d.data === 'function' ? d.data() : {};
            if (!u) return false;
            const uTicket = String(u.ticketId || u.symplaTicket?.ticketNumber || '').trim().toUpperCase();
            const uQr = String(u.symplaTicket?.qrCodeData || '').trim().toUpperCase();
            const uEmail = String(u.email || '').trim().toLowerCase();
            return (
              (upperTicket && (uTicket === upperTicket || uQr === upperTicket || uTicket.replace(/[-\s]/g, '') === cleanAlphaNum || uQr.replace(/[-\s]/g, '') === cleanAlphaNum)) ||
              (lowerEmail && uEmail === lowerEmail)
            );
          });
          if (matchedDoc) {
            const mData = matchedDoc.data();
            mergePartial(matchedDoc.id, lookupLocalDirectoryProfile(matchedDoc.id, mData?.email || symplaEmail));
            mergePartial(matchedDoc.id, mData);
            return formatParticipant(matchedDoc.id, partialData, { ...(symplaParticipant || {}), ...(parsedJson || {}) });
          }
        }
      } catch {}

      if (symplaParticipant || hasRealParticipantName(partialData) || partialData.email) {
        const firstName = partialData.firstName || partialData.first_name || symplaParticipant?.firstName || symplaParticipant?.first_name || '';
        const lastName = partialData.lastName || partialData.last_name || symplaParticipant?.lastName || symplaParticipant?.last_name || '';
        const resolvedTicketNumber = symplaParticipant?.ticketNumber || symplaParticipant?.ticket_number || ticketNumber;
        const fullName =
          [firstName, lastName].filter(Boolean).join(' ').trim() ||
          (partialData.displayName && partialData.displayName !== 'Participante' ? partialData.displayName : '') ||
          (partialData.name && partialData.name !== 'Participante' ? partialData.name : '') ||
          'Participante';
        return formatParticipant(
          partialUid || symplaEmail || `sympla_${resolvedTicketNumber}`,
          {
            ...partialData,
            displayName: fullName,
            firstName,
            lastName,
            email: symplaEmail,
            username: partialData.username || (symplaEmail ? symplaEmail.split('@')[0] : '')
          },
          parsedJson
        );
      }
    } catch {}
  }

  // 6. Fallback: se os dados parsed contiverem informações locais suficientes
  if (parsedJson && (parsedJson.uid || parsedJson.participantUid || parsedJson.name || parsedJson.username || parsedJson.email || parsedJson.participantType)) {
    const resolvedUid = parsedJson.uid || parsedJson.participantUid || parsedJson.email || `temp_${Date.now()}`;
    return {
      participantUid: resolvedUid,
      name: parsedJson.name || parsedJson.displayName || parsedJson.username || parsedJson.email || 'Participante',
      username: parsedJson.username || (parsedJson.email ? parsedJson.email.split('@')[0] : ''),
      firstName: parsedJson.firstName || (parsedJson.name || 'Participante').split(' ')[0],
      course: parsedJson.course || 'Computação',
      period: parsedJson.period || null,
      institution: parsedJson.institution || '',
      phone: parsedJson.phone || '',
      email: parsedJson.email || '',
      linkedin: parsedJson.linkedin || '',
      instagram: parsedJson.instagram || '',
      github: parsedJson.github || '',
      participantType: parsedJson.participantType || 'Estudante',
      avatarUrl: parsedJson.avatarUrl || parsedJson.photoURL || null
    };
  }

  // 7. Fallback offline/resiliente para QR Codes válidos de ingresso Sympla (ex: SYMPLA:T123456, ABCD-01-2345, T123456)
  const isSymplaBadgeFormat =
    ticketNumber &&
    !ticketNumber.startsWith('QR_') &&
    (/^(SYMPLA:[A-Z0-9-]+|T\d{4,14}|[A-Z0-9]{4}-[A-Z0-9]{2}-[A-Z0-9]{4}|[A-Z0-9]{8,16})$/i.test(trimmed) ||
      /^SYMPLA:/i.test(trimmed));

  if (isSymplaBadgeFormat) {
    const cleanTicket = ticketNumber.toUpperCase();
    return {
      participantUid: `sympla_${cleanTicket}`,
      name: `Participante #${cleanTicket}`,
      username: `sympla_${cleanTicket.toLowerCase()}`,
      firstName: 'Participante',
      course: 'TechWeek',
      period: null,
      institution: 'UFU',
      phone: '',
      email: '',
      linkedin: '',
      instagram: '',
      github: '',
      participantType: 'Participante Credenciado',
      ticketId: cleanTicket,
      avatarUrl: null
    };
  }

  return null;
}

function formatParticipant(uid, data = {}, fallback = null) {
  const fb = fallback || {};
  const dp = data.participant && typeof data.participant === 'object' ? data.participant : {};
  const fbp = fb.participant && typeof fb.participant === 'object' ? fb.participant : {};

  const firstName =
    data.firstName ||
    data.first_name ||
    dp.firstName ||
    dp.first_name ||
    fb.firstName ||
    fb.first_name ||
    fbp.firstName ||
    fbp.first_name ||
    '';
  const lastName =
    data.lastName ||
    data.last_name ||
    dp.lastName ||
    dp.last_name ||
    fb.lastName ||
    fb.last_name ||
    fbp.lastName ||
    fbp.last_name ||
    '';
  const joinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const pickValidName = (...candidates) => {
    for (const c of candidates) {
      const s = String(c || '').trim();
      if (s && s.toLowerCase() !== 'participante') return s;
    }
    return '';
  };

  const email = data.email || dp.email || fb.email || fbp.email || '';
  const username =
    data.username ||
    dp.username ||
    fb.username ||
    fbp.username ||
    (email ? email.split('@')[0] : '');

  const name =
    pickValidName(
      joinedName,
      data.displayName,
      data.name,
      dp.displayName,
      dp.name,
      fb.name,
      fb.displayName,
      fbp.name,
      fbp.displayName,
      username
    ) || 'Participante';

  return {
    participantUid: uid || data.uid || dp.uid || fb.uid || fb.participantUid || '',
    name,
    username,
    firstName: firstName || name.split(' ')[0],
    email,
    phone: data.phone || data.telefone || dp.phone || fb.phone || '',
    course: data.course || data.curso || dp.course || fb.course || 'Não informado',
    period: data.period ?? data.periodo ?? dp.period ?? fb.period ?? null,
    institution: data.institution || data.instituicao || dp.institution || fb.institution || '',
    linkedin: data.linkedin || dp.linkedin || fb.linkedin || '',
    instagram: data.instagram || dp.instagram || fb.instagram || '',
    github: data.github || dp.github || fb.github || '',
    participantType: data.participantType || data.participant_type || dp.participantType || fb.participantType || 'Aluno',
    avatarUrl: data.avatarUrl || data.photoURL || dp.avatarUrl || fb.avatarUrl || fb.photoURL || null
  };
}

/**
 * Envia os dados do lead para POST /api/leads
 * 
 * @param {object} payload
 * @param {string} payload.participantUid
 * @param {string} payload.notes
/**
 * Lead padrão semente (bipado e qualificado) para validação imediata do dashboard e estande.
 * Permite que o patrocinador visualize os dados no painel logo ao acessar (Home, CRM, Split-View e ROI).
 */
export const SEED_BIPADO_LEAD = {
  id: 'lead_mariana_souza_seed',
  participantUid: 'demo_mariana_souza',
  name: 'Mariana Souza',
  firstName: 'Mariana',
  username: 'mariana.souza',
  email: 'mariana.souza@ufu.br',
  phone: '(34) 99123-4567',
  course: 'Ciência da Computação',
  period: 6,
  participantType: 'Aluno UFU Graduação',
  instituicao: 'UFU',
  github: 'marianasouza-dev',
  linkedin: 'mariana-souza-tech',
  rating: 5,
  tags: ['Frontend', 'React', 'Estágio', 'Destaque'],
  notes: '[Frontend] [React] [Estágio] [Destaque] Excelente domínio de React, Tailwind e APIs REST. Participou de projeto de iniciação científica e busca estágio para 2027.',
  companyId: 'kanastra',
  companyName: 'Kanastra',
  sponsorUid: 'sponsor_current',
  collectedByEmail: 'recrutamento@kanastra.com.br',
  collectedByName: 'Tech Recruiter',
  createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
};

const getLeadsStorageKey = (companyId) => `facom_sponsor_leads_${companyId || 'default'}`;
const inMemoryLeadsCache = new Map();

export function getLocalSponsorLeads(companyId) {
  const storageKey = getLeadsStorageKey(companyId);
  if (typeof localStorage === 'undefined') {
    if (!inMemoryLeadsCache.has(storageKey)) {
      inMemoryLeadsCache.set(storageKey, [SEED_BIPADO_LEAD]);
    }
    return inMemoryLeadsCache.get(storageKey) || [SEED_BIPADO_LEAD];
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      const initial = [SEED_BIPADO_LEAD];
      localStorage.setItem(storageKey, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SEED_BIPADO_LEAD];
  } catch (_e) {
    return [SEED_BIPADO_LEAD];
  }
}

export function saveLocalSponsorLead(lead, companyId) {
  if (!lead) return;
  const storageKey = getLeadsStorageKey(companyId);
  try {
    const current = getLocalSponsorLeads(companyId);
    const existingIndex = current.findIndex((l) => l.participantUid === lead.participantUid);
    let updated;
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...lead, updatedAt: new Date().toISOString() };
    } else {
      updated = [lead, ...current];
    }

    if (typeof localStorage === 'undefined') {
      inMemoryLeadsCache.set(storageKey, updated);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('facom_leads_updated'));
    }
  } catch (_e) {}
}

/**
 * Envia os dados do lead para POST /api/leads com fallback resiliente offline/local.
 * 
 * @param {object} payload
 * @param {string} payload.participantUid
 * @param {string} payload.notes
 * @param {number} payload.rating 1 a 5 estrelas
 * @param {string} [payload.companyId]
 * @param {boolean} [payload.validateOnly]
 * @param {Array<string>} [payload.tags]
 * @param {object} [payload.participantData]
 * @returns {Promise<object>} Resposta com dados do lead salvo e whatsapp
 */
export async function submitLead({ participantUid, notes, rating, companyId, validateOnly, tags, participantData }) {
  if (!participantUid) {
    throw new Error('participantUid é obrigatório.');
  }

  // Se o UID for temporário, sympla_ ou contiver e-mail, resolve o UID real no Firestore
  let effectiveUid = participantUid;
  const emailToLookup = participantData?.email || (typeof effectiveUid === 'string' && effectiveUid.includes('@') ? effectiveUid : null);
  if (emailToLookup && (typeof effectiveUid !== 'string' || effectiveUid.startsWith('temp_') || effectiveUid.startsWith('sympla_') || effectiveUid.includes('@'))) {
    try {
      const cleanEmail = emailToLookup.replace(/^mailto:/i, '').trim().toLowerCase();
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1)));
      if (snap && !snap.empty) {
        effectiveUid = snap.docs[0].id;
      }
    } catch {}
  }

  const nowIso = new Date().toISOString();
  const localLead = {
    id: `lead_${effectiveUid}_${Date.now()}`,
    participantUid: effectiveUid,
    rating: rating ? Number(rating) : 0,
    notes: notes || '',
    tags: Array.isArray(tags) ? tags : [],
    companyId: companyId || 'kanastra',
    sponsorUid: auth?.currentUser?.uid || 'sponsor_current',
    collectedByEmail: auth?.currentUser?.email || 'recrutador@empresa.com',
    createdAt: nowIso,
    updatedAt: nowIso,
    name: participantData?.name || participantData?.displayName || 'Participante',
    firstName: participantData?.firstName || participantData?.name?.split(' ')[0] || 'Participante',
    username: participantData?.username || '',
    avatarUrl: participantData?.avatarUrl || participantData?.photoURL || null,
    email: participantData?.email || (typeof participantUid === 'string' && participantUid.includes('@') ? participantUid : ''),
    phone: participantData?.phone || '',
    course: participantData?.course || 'Não informado',
    period: participantData?.period || null,
    participantType: participantData?.participantType || 'Aluno UFU Graduação',
    instituicao: participantData?.instituicao || participantData?.institution || 'UFU',
    institution: participantData?.institution || participantData?.instituicao || 'UFU',
    github: participantData?.github || '',
    linkedin: participantData?.linkedin || '',
    instagram: participantData?.instagram || ''
  };

  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads`.replace('//leads', '/leads');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        participantUid: effectiveUid,
        notes: notes || '',
        rating: rating ? Number(rating) : undefined,
        companyId: companyId || undefined,
        validateOnly: validateOnly ? true : undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        participantData: participantData || undefined
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404 || response.status >= 500 || data?.error === 'EMAIL_NOT_VERIFIED') {
        if (!validateOnly) {
          saveLocalSponsorLead(localLead, companyId);
        }
        return {
          success: true,
          message: validateOnly ? 'Presença validada com sucesso.' : 'Lead registrado com sucesso.',
          lead: localLead,
          offline: true
        };
      }
      const errorMsg = data?.message || data?.error || 'Erro ao registrar lead de patrocinador.';
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (!validateOnly && data?.lead) {
      saveLocalSponsorLead({ ...localLead, ...data.lead }, companyId);
    }
    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    console.warn('Falha de rede ao conectar com /api/leads. Ativando persistência resiliente:', err);
    if (!validateOnly) {
      saveLocalSponsorLead(localLead, companyId);
    }
    return {
      success: true,
      message: validateOnly ? 'Presença validada com sucesso.' : 'Lead registrado com sucesso.',
      lead: localLead,
      offline: true
    };
  }
}

/**
 * Busca os leads do patrocinador (meus e da empresa) com fallback integrado.
 * @param {string} [companyId]
 * @returns {Promise<{ myLeads: Array, companyLeads: Array, companyId: string }>}
 */
export async function fetchLeads(companyId) {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApiBaseUrl();
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const url = `${baseUrl}/leads${query}`.replace('//leads', '/leads');

  try {
    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || 'Erro ao carregar leads.';
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    const myLeads = Array.isArray(data?.myLeads) ? data.myLeads : [];
    const companyLeads = Array.isArray(data?.companyLeads) ? data.companyLeads : [];

    return {
      myLeads,
      companyLeads,
      companyId: data?.companyId || companyId || 'kanastra'
    };
  } catch (err) {
    if (err.status) {
      throw err;
    }
    console.warn('API de leads indisponível ou offline. Usando persistência local resiliente:', err);
    const localLeads = getLocalSponsorLeads(companyId);
    return {
      myLeads: localLeads,
      companyLeads: localLeads,
      companyId: companyId || 'kanastra'
    };
  }
}

/**
 * Atualiza avaliação (rating), observações (notes) e tags de um lead capturado.
 * @param {object} payload
 * @param {string} payload.participantUid
 * @param {number} [payload.rating] 0 a 5
 * @param {string} [payload.notes]
 * @param {string} [payload.companyId]
 * @param {Array<string>} [payload.tags]
 * @returns {Promise<object>}
 */
export async function updateLead({ participantUid, rating, notes, companyId, tags }) {
  if (!participantUid) throw new Error('participantUid é obrigatório.');

  const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/leads/${encodeURIComponent(participantUid)}`.replace('//leads', '/leads');

  const updatedPayload = {
    rating: rating !== undefined ? Number(rating) : undefined,
    notes: notes !== undefined ? String(notes) : undefined,
    companyId: companyId || undefined,
    tags: Array.isArray(tags) ? tags : undefined
  };

  saveLocalSponsorLead({
    participantUid,
    rating: rating !== undefined ? Number(rating) : 0,
    notes: notes !== undefined ? String(notes) : '',
    tags: Array.isArray(tags) ? tags : [],
    companyId: companyId || 'kanastra'
  }, companyId);

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updatedPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || 'Erro ao atualizar lead.';
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    console.warn('API updateLead offline ou indisponível. Salvo localmente:', err);
    return {
      success: true,
      message: 'Lead atualizado com sucesso.',
      offline: true
    };
  }
}

/**
 * Utilitário de exportação de leads para arquivo CSV compatível com Excel/Google Sheets.
 * @param {Array<object>} leads Lista de leads
 * @param {string} [companyName] Nome da empresa para o nome do arquivo
 */
export function exportLeadsToCsv(leads = [], companyName = 'patrocinador', scope = '') {
  if (!leads || leads.length === 0) {
    return false;
  }

  const headers = [
    'Nome',
    'E-mail',
    'Telefone / WhatsApp',
    'Curso / Graduação',
    'Período',
    'Tipo de Vínculo',
    'Avaliação (Estrelas)',
    'Classificação / Status',
    'Tags / Habilidades',
    'Observações / Notas',
    'GitHub',
    'LinkedIn',
    'Instagram',
    'Faixa Etária',
    'Coletado Por',
    'Empresa',
    'Data / Hora'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const getStatusLabel = (rating) => {
    const r = Number(rating) || 0;
    if (r === 5) return 'Destaque Máximo (5 ★)';
    if (r === 4) return 'Altamente Qualificado (4 ★)';
    if (r === 3) return 'Bom Potencial (3 ★)';
    if (r > 0) return `Avaliado (${r} ★)`;
    return 'Sem classificação';
  };

  const rows = leads.map((lead) => {
    const dateFormatted = lead.createdAt
      ? (typeof lead.createdAt?.toDate === 'function' ? lead.createdAt.toDate().toLocaleString('pt-BR') : new Date(lead.createdAt).toLocaleString('pt-BR'))
      : '';
    const ratingNum = Number(lead.rating) || 0;
    const formattedTags = Array.isArray(lead.tags) ? lead.tags.join(', ') : '';
    return [
      escapeCsv(lead.name || ''),
      escapeCsv(lead.email || ''),
      escapeCsv(lead.phone || ''),
      escapeCsv(lead.course || ''),
      escapeCsv(lead.period ? `${lead.period}º Período` : ''),
      escapeCsv(lead.participantType || lead.instituicao || ''),
      escapeCsv(ratingNum > 0 ? `${ratingNum} ★` : 'Sem nota'),
      escapeCsv(getStatusLabel(ratingNum)),
      escapeCsv(formattedTags),
      escapeCsv(lead.notes || ''),
      escapeCsv(lead.github || ''),
      escapeCsv(lead.linkedin || ''),
      escapeCsv(lead.instagram || ''),
      escapeCsv(lead.faixaEtaria || ''),
      escapeCsv(lead.collectedByEmail || lead.sponsorUid || ''),
      escapeCsv(companyName || ''),
      escapeCsv(dateFormatted)
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) garante acentuação perfeita no Microsoft Excel e Google Sheets
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  if (typeof document === 'undefined') {
    return true;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const scopeSuffix = scope ? `_${scope.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  // Mantém o prefixo 'leads_{company}_techweek_' para compatibilidade e adiciona escopo
  a.download = `leads_${sanitizedCompany}_techweek_${dateStr}${scopeSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Calcula métricas executivas de ROI do estande para apresentação pós-evento.
 * 
 * @param {Array<object>} leads Lista de leads capturados
 * @param {number} [totalEventAttendees=600] Total estimado de inscritos na TechWeek
 */
export function calculateSponsorRoi(leads = [], totalEventAttendees = 600) {
  const totalLeads = leads.length;
  if (totalLeads === 0) {
    return {
      totalLeads: 0,
      qualifiedCount: 0,
      qualificationRate: 0,
      topTalentsCount: 0,
      withPhoneCount: 0,
      withGithubCount: 0,
      penetrationRate: 0,
      courses: [],
      periods: {
        inicio: 0,
        meio: 0,
        conclusao: 0,
        posGrad: 0,
        outro: 0
      },
      tags: [],
      attendants: [],
      ratingFunnel: {
        total: 0,
        contactable: 0,
        evaluated: 0,
        qualified: 0,
        destaques: 0
      }
    };
  }

  let qualifiedCount = 0;
  let topTalentsCount = 0;
  let withPhoneCount = 0;
  let withGithubCount = 0;
  let evaluatedCount = 0;

  const courseCounts = {};
  const tagCounts = {};
  const attendantCounts = {};
  const periods = {
    inicio: 0,
    meio: 0,
    conclusao: 0,
    posGrad: 0,
    outro: 0
  };

  leads.forEach((l) => {
    const r = Number(l.rating) || 0;
    if (r > 0) evaluatedCount++;
    if (r >= 4) qualifiedCount++;
    if (r === 5) topTalentsCount++;
    if (l.phone && String(l.phone).replace(/\D/g, '').length >= 10) withPhoneCount++;
    if (l.github && String(l.github).trim()) withGithubCount++;

    // Cursos
    const rawCourse = (l.course || 'Não informado').trim();
    courseCounts[rawCourse] = (courseCounts[rawCourse] || 0) + 1;

    // Períodos
    const p = Number(l.period);
    const typeStr = (l.participantType || '').toLowerCase();
    if (typeStr.includes('pós') || typeStr.includes('mestrado') || typeStr.includes('doutorado')) {
      periods.posGrad++;
    } else if (p >= 1 && p <= 3) {
      periods.inicio++;
    } else if (p >= 4 && p <= 6) {
      periods.meio++;
    } else if (p >= 7) {
      periods.conclusao++;
    } else {
      periods.outro++;
    }

    // Tags
    if (Array.isArray(l.tags)) {
      l.tags.forEach((t) => {
        const cleanT = String(t).trim();
        if (cleanT) {
          tagCounts[cleanT] = (tagCounts[cleanT] || 0) + 1;
        }
      });
    }

    // Atendentes
    const collector = l.collectedByEmail || 'Estande Geral';
    attendantCounts[collector] = (attendantCounts[collector] || 0) + 1;
  });

  const courses = Object.entries(courseCounts)
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const attendants = Object.entries(attendantCounts)
    .map(([email, count]) => ({
      email,
      name: email.split('@')[0],
      count,
      percent: Math.round((count / totalLeads) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const qualificationRate = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;
  const penetrationRate = totalEventAttendees > 0 ? Number(((totalLeads / totalEventAttendees) * 100).toFixed(1)) : 0;

  return {
    totalLeads,
    qualifiedCount,
    qualificationRate,
    topTalentsCount,
    withPhoneCount,
    withGithubCount,
    penetrationRate,
    courses,
    periods,
    tags,
    attendants,
    ratingFunnel: {
      total: totalLeads,
      contactable: withPhoneCount,
      evaluated: evaluatedCount,
      qualified: qualifiedCount,
      destaques: topTalentsCount
    }
  };
}

