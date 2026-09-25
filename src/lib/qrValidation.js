// REG-SCANNER-001 (KAN-71, CONFIRMADA): o QR escaneado no scanner de
// presença só pode creditar pontos se for o QR da palestra que o usuário
// selecionou. Convenção de payload definida no ticket: JSON
// { "lectureId": "<id da palestra>" }.
//
// Função pura, sem I/O, pra poder ser testada isolada e reaproveitada tanto
// pelo client (LectureScanner.jsx) quanto por qualquer outro lugar que
// precise da mesma checagem no futuro. Nunca lança exceção: payload
// malformado é tratado como "não corresponde", não como erro.
export function isQrForLecture(rawScanData, expectedLectureId) {
  if (typeof rawScanData !== 'string' || typeof expectedLectureId !== 'string' || !expectedLectureId) {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawScanData);
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  if (typeof parsed.lectureId !== 'string' || !parsed.lectureId) {
    return false;
  }

  return parsed.lectureId === expectedLectureId;
}
