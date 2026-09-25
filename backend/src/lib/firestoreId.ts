// Path segments do Firestore não podem conter "/" (o SDK decodifica %2F de volta
// pra "/" literal num param de rota do Express, e um path com número ímpar de
// segmentos faz o Admin SDK lançar exceção síncrona em .doc(...) — antes de
// qualquer try/catch em volta). Todo id vindo de req.params usado em
// db.collection(...).doc(id) tem que passar por aqui primeiro.
const VALID_ID = /^[A-Za-z0-9_-]{1,200}$/;

export function isValidFirestoreId(value: string): boolean {
  return VALID_ID.test(value);
}
