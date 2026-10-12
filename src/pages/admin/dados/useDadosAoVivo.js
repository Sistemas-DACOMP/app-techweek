import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// Só leitura (regras já liberam ADMIN): checkins, pointEvents e leads/{sponsor}/contacts.
// activities/users/missions chegam por props do Admin. Não usa subscribeToLiveAnalytics porque ele
// injeta dados de exemplo (mock) quando o Firestore demora, e aqui o painel só mostra dado real.
// `nonce` re-assina os listeners (botão Atualizar).
export function useDadosAoVivo(sponsorUids, nonce = 0) {
  const [data, setData] = useState({ checkins: [], pointEvents: [] });
  const [status, setStatus] = useState({ ready: false, error: false, updatedAt: null });
  const [leads, setLeads] = useState({});
  const sponsorKeyStr = sponsorUids.join('|');

  useEffect(() => {
    const got = new Set();
    const sub = (name) => onSnapshot(
      collection(db, name),
      (snap) => {
        got.add(name);
        setData((d) => ({ ...d, [name]: snap.docs.map((x) => ({ id: x.id, ...x.data() })) }));
        setStatus((s) => ({ ...s, ready: got.size === 2, updatedAt: new Date() }));
      },
      (err) => {
        console.warn(`[dados] falha ao ler ${name}:`, err?.code || err);
        got.add(name);
        setStatus((s) => ({ ...s, ready: true, error: true, updatedAt: new Date() }));
      }
    );
    const unsubs = [sub('checkins'), sub('pointEvents')];
    return () => unsubs.forEach((u) => u());
  }, [nonce]);

  useEffect(() => {
    const uids = sponsorKeyStr ? sponsorKeyStr.split('|') : [];
    const unsubs = uids.map((uid) => onSnapshot(
      collection(db, 'leads', uid, 'contacts'),
      (snap) => setLeads((l) => ({ ...l, [uid]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })),
      () => setLeads((l) => ({ ...l, [uid]: [] }))
    ));
    return () => unsubs.forEach((u) => u());
  }, [sponsorKeyStr, nonce]);

  return { ...data, ...status, leadsBySponsor: leads };
}
