import { describe, it, expect } from 'vitest';
import { isQrForLecture } from './qrValidation';

// REG-SCANNER-001 (KAN-71, CONFIRMADA): o QR escaneado no scanner de
// presença só pode creditar pontos se for o QR da palestra que o usuário
// selecionou. Payload esperado é JSON { "lectureId": "<id da palestra>" }.
// Malformado/inesperado conta como "não corresponde" (false), nunca lança.
describe('isQrForLecture (REG-SCANNER-001 / KAN-71)', () => {
  it('aceita quando o lectureId do QR bate exatamente com a palestra selecionada', () => {
    expect(isQrForLecture('{"lectureId":"palestra-1"}', 'palestra-1')).toBe(true);
  });

  it('rejeita quando o QR é de outra palestra', () => {
    expect(isQrForLecture('{"lectureId":"palestra-2"}', 'palestra-1')).toBe(false);
  });

  it('rejeita comparação parcial/substring do lectureId (match precisa ser exato)', () => {
    expect(isQrForLecture('{"lectureId":"palestra-1-extra"}', 'palestra-1')).toBe(false);
  });

  it('rejeita JSON malformado', () => {
    expect(isQrForLecture('{lectureId: palestra-1', 'palestra-1')).toBe(false);
    expect(isQrForLecture('não é json', 'palestra-1')).toBe(false);
    expect(isQrForLecture('', 'palestra-1')).toBe(false);
  });

  it('rejeita JSON válido sem o campo lectureId', () => {
    expect(isQrForLecture('{"outraCoisa":"palestra-1"}', 'palestra-1')).toBe(false);
  });

  it('rejeita quando lectureId não é string (ex: numero)', () => {
    expect(isQrForLecture('{"lectureId":123}', 'palestra-1')).toBe(false);
  });

  it('rejeita quando lectureId é string vazia', () => {
    expect(isQrForLecture('{"lectureId":""}', 'palestra-1')).toBe(false);
  });

  it('rejeita quando o JSON decodifica pra um array em vez de objeto', () => {
    expect(isQrForLecture('["palestra-1"]', 'palestra-1')).toBe(false);
  });

  it('rejeita quando o JSON decodifica pra null ou pra um primitivo (não objeto)', () => {
    expect(isQrForLecture('null', 'palestra-1')).toBe(false);
    expect(isQrForLecture('"palestra-1"', 'palestra-1')).toBe(false);
    expect(isQrForLecture('123', 'palestra-1')).toBe(false);
  });

  it('rejeita quando rawScanData não é string', () => {
    expect(isQrForLecture(null, 'palestra-1')).toBe(false);
    expect(isQrForLecture(undefined, 'palestra-1')).toBe(false);
    expect(isQrForLecture(123, 'palestra-1')).toBe(false);
    expect(isQrForLecture({ lectureId: 'palestra-1' }, 'palestra-1')).toBe(false);
  });

  it('rejeita quando expectedLectureId está ausente ou vazio', () => {
    expect(isQrForLecture('{"lectureId":"palestra-1"}', '')).toBe(false);
    expect(isQrForLecture('{"lectureId":"palestra-1"}', null)).toBe(false);
    expect(isQrForLecture('{"lectureId":"palestra-1"}', undefined)).toBe(false);
  });

  it('rejeita quando expectedLectureId não é string', () => {
    expect(isQrForLecture('{"lectureId":"123"}', 123)).toBe(false);
  });

  it('nunca lança exceção, mesmo com entradas hostis', () => {
    expect(() => isQrForLecture('{"lectureId":', 'palestra-1')).not.toThrow();
    expect(() => isQrForLecture(undefined, undefined)).not.toThrow();
  });
});
