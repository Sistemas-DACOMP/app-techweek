import { db } from '../config/firebaseAdmin';

export class TicketInUseError extends Error {
  constructor() {
    super('Este ingresso já está vinculado a outra conta.');
  }
}

export const TICKET_IN_USE_MESSAGE = 'Este ingresso já está vinculado a outra conta. Se for seu, fale com a organização do evento.';

const indexId = (ticketNumber: string) => encodeURIComponent(ticketNumber.trim().toUpperCase());

/**
 * Vincula o ingresso ao usuário numa transação: o doc `symplaTickets/{ticket}` é o índice de
 * unicidade (KAN-108). Se já aponta pra outro uid, lança TicketInUseError e nada é gravado.
 * Trocar de ingresso libera o índice do anterior.
 */
export async function linkSymplaTicket(uid: string, ticket: { ticketNumber: string } & Record<string, unknown>) {
  const indexes = db.collection('symplaTickets');
  const userRef = db.collection('users').doc(uid);
  const newRef = indexes.doc(indexId(ticket.ticketNumber));

  await db.runTransaction(async (tx) => {
    const [owner, user] = await Promise.all([tx.get(newRef), tx.get(userRef)]);
    if (owner.exists && owner.data()?.uid !== uid) throw new TicketInUseError();

    const prev = user.data()?.symplaTicket?.ticketNumber;
    if (prev && indexId(prev) !== newRef.id) {
      const prevRef = indexes.doc(indexId(prev));
      const prevOwner = await tx.get(prevRef);
      if (prevOwner.exists && prevOwner.data()?.uid === uid) tx.delete(prevRef);
    }

    tx.set(newRef, { uid, linkedAt: new Date().toISOString() });
    tx.set(
      userRef,
      {
        symplaTicket: ticket,
        hasSymplaTicket: true,
        ticketId: ticket.ticketNumber,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  });
}

/**
 * Desvincula o ingresso Sympla do usuário, liberando o índice em `symplaTickets/{ticket}`
 * e limpando as propriedades de ingresso no doc do usuário.
 */
export async function unlinkSymplaTicket(uid: string) {
  const indexes = db.collection('symplaTickets');
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists) return;

    const currentTicket = user.data()?.symplaTicket?.ticketNumber || user.data()?.ticketId || user.data()?.symplaTicketCode;
    if (currentTicket) {
      const ticketRef = indexes.doc(indexId(currentTicket));
      const ticketDoc = await tx.get(ticketRef);
      if (ticketDoc.exists && ticketDoc.data()?.uid === uid) {
        tx.delete(ticketRef);
      }
    }

    tx.set(
      userRef,
      {
        symplaTicket: null,
        hasSymplaTicket: false,
        ticketId: null,
        symplaTicketCode: null,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  });
}

