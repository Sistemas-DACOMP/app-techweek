import { useState } from 'react';
import { Check, Plus, Trash2, X, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { btn, ICON_BTN, Section, Field, SwitchRow } from './ui';
import MissionPreview, { CARD_STYLES } from './MissionPreview';

/* 2.06 Nova missão: seletor "Estilo do card" + prévia ao vivo. Mesmo estado e mesmo salvar de antes. */

const FORM_ID = 'adm-mission-form';
const TIERS = [['diamante', 'Diamante'], ['ouro', 'Ouro'], ['prata', 'Prata']];
const TILE_BG = {
  relampago: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.06))',
  patrocinador: 'linear-gradient(160deg, rgba(34,211,238,0.14), var(--surface) 55%)',
  secreta: 'linear-gradient(135deg, #1D1347, #0E0B26)',
};

export default function MissionForm({ form, setForm, editingId, saving, triggerModes, categories, onSubmit, onCancel }) {
  const [downloadingQr, setDownloadingQr] = useState(false);
  const set = (patch) => setForm((p) => ({ ...p, ...patch }));
  const opt = (patch) => setForm((p) => ({ ...p, cardStyleOptions: { ...p.cardStyleOptions, ...patch } }));
  const opts = form.cardStyleOptions || {};
  const style = form.cardStyle || 'padrao';
  const meta = CARD_STYLES.find((s) => s.key === style);
  const title = editingId ? 'Editar missão' : 'Nova missão';
  const submitLabel = editingId ? 'Salvar alterações' : 'Publicar missão';

  const effectiveQrValue = form.qrCodeValue || (editingId ? `TW_MISSAO_${editingId}` : form.title ? `TW_MISSAO_${form.title.toUpperCase().replace(/[^A-Z0-9]/g, '_')}` : 'TW_MISSAO_TECHWEEK');

  const handleDownloadQrPng = async () => {
    setDownloadingQr(true);
    try {
      const svgElem = document.getElementById('mission-qr-svg-preview');
      if (!svgElem) {
        setDownloadingQr(false);
        return;
      }

      const svgXml = new XMLSerializer().serializeToString(svgElem);
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);

      const canvas = document.createElement('canvas');
      const width = 1000;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Fundo escuro premium TechWeek
      ctx.fillStyle = '#0A0F24';
      ctx.fillRect(0, 0, width, height);

      // Moldura elegante da marca
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Topo: Cabeçalho
      ctx.fillStyle = '#8FA0FF';
      ctx.font = 'bold 28px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FACOM TECHWEEK 2026', width / 2, 90);

      ctx.fillStyle = '#EEF1FA';
      ctx.font = '900 44px Montserrat, sans-serif';
      const cleanTitle = (form.title || 'Missão Especial TechWeek').slice(0, 32);
      ctx.fillText(cleanTitle, width / 2, 160);

      // Badge de XP Violeta
      const ptsText = `+${Number(form.points) || 50} PTS XP`;
      ctx.font = '800 28px Montserrat, sans-serif';
      const ptsWidth = ctx.measureText(ptsText).width + 60;
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.roundRect((width - ptsWidth) / 2, 195, ptsWidth, 54, 27);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ptsText, width / 2, 232);

      // Imagem do QR Code
      const img = new Image();
      img.onload = () => {
        // Placa branca com cantos arredondados
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(175, 290, 650, 650, 40);
        ctx.fill();

        // Desenhar o QR
        ctx.drawImage(img, 220, 335, 560, 560);
        URL.revokeObjectURL(blobUrl);

        // Instrução de Escaneamento
        ctx.fillStyle = '#EEF1FA';
        ctx.font = 'bold 36px Montserrat, sans-serif';
        ctx.fillText('Escaneie com o app TechWeek', width / 2, 1020);

        ctx.fillStyle = '#A9B1CC';
        ctx.font = '600 24px Montserrat, sans-serif';
        ctx.fillText('Abra o app > Crachá > Escanear', width / 2, 1070);

        // Rodapé
        ctx.fillStyle = '#6E779A';
        ctx.font = '500 18px Montserrat, sans-serif';
        ctx.fillText(`Token de Validação: ${effectiveQrValue}`, width / 2, 1140);

        // Disparar download do PNG
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-missao-${(form.title || 'techweek').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();
        setDownloadingQr(false);
      };
      img.src = blobUrl;
    } catch (err) {
      console.error('Erro ao gerar PNG do QR Code:', err);
      setDownloadingQr(false);
    }
  };

  const pickStyle = (key) => {
    const patch = { cardStyle: key, isFlash: key === 'relampago' };
    if (key === 'secreta') patch.triggerMode = 'secret';
    else if (key === 'caca-qr') patch.triggerMode = 'qr';
    else if (key === 'quiz') patch.triggerMode = 'quiz';
    else if (form.triggerMode === 'secret') patch.triggerMode = 'form';
    set(patch);
  };
  const pickTrigger = (mode) => set({ triggerMode: mode, ...(mode === 'secret' ? { cardStyle: 'secreta' } : mode === 'qr' ? { cardStyle: 'caca-qr' } : mode === 'quiz' ? { cardStyle: 'quiz' } : {}) });

  const setField = (i, patch) => set({ fields: form.fields.map((f, j) => (j === i ? { ...f, ...patch, ...(patch.type === 'select' && !f.options ? { options: ['Opção 1', 'Opção 2'] } : {}) } : f)) });

  return (
    <>
      <div className="mb-6 hidden items-end gap-3 lg:flex">
        <div className="flex-1">
          <div className="text-[13px] font-bold text-text-3">
            <button type="button" onClick={onCancel} className="text-link">Missões</button> / {title}
          </div>
          <h1 className="m-0 mt-1.5 text-[28px] font-extrabold">{title}</h1>
        </div>
        <button type="button" className={btn('quiet')} onClick={onCancel}>Cancelar</button>
        <button type="submit" form={FORM_ID} disabled={saving} className={btn('action', 'font-extrabold')}><Check size={18} aria-hidden="true" /> {submitLabel}</button>
      </div>

      <div className="grid items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0">
        <form id={FORM_ID} onSubmit={onSubmit} className="order-2 flex flex-col gap-4 lg:order-1">
          <Section title="Estilo do card" subtitle="Define como a missão aparece para o participante. Cada estilo tem efeitos próprios.">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {CARD_STYLES.map((s) => {
                const sel = s.key === style;
                const Icon = s.icon;
                return (
                  <button key={s.key} type="button" aria-pressed={sel} onClick={() => pickStyle(s.key)}
                    className="press relative flex flex-col items-start gap-2 rounded-[14px] p-3 text-left text-text"
                    style={{ background: (sel || s.key !== 'secreta') && TILE_BG[s.key] ? TILE_BG[s.key] : 'var(--surface)', border: sel ? '2px solid var(--link)' : '1px solid var(--line-2)', boxShadow: sel ? '0 0 0 4px rgba(143,160,255,0.18)' : 'none', padding: sel ? 11 : 12 }}>
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]" style={{ background: `${s.color}24`, color: s.color }}><Icon size={18} aria-hidden="true" /></span>
                    <span>
                      <span className="block text-[13px] font-extrabold">{s.label}</span>
                      <span className="mt-px block text-[11px] text-text-2">{s.desc}</span>
                    </span>
                    {sel && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-link text-bg"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Informações">
            <div className="flex flex-col gap-3.5">
              <Field label="Título">{(id) => <input id={id} required className="field" placeholder="Ex: Conheça o Stand da Kanastra" value={form.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
              <Field label="Descrição">{(id) => <textarea id={id} required rows={2} className="field resize-none py-3 leading-snug" style={{ height: 'auto' }} placeholder="Explique o que a pessoa precisa fazer" value={form.description} onChange={(e) => set({ description: e.target.value })} />}</Field>
              <div className="grid grid-cols-[1.5fr_1fr] gap-3.5">
                <Field label="Como completa">
                  {(id) => (
                    <select id={id} className="field" value={form.triggerMode} onChange={(e) => pickTrigger(e.target.value)}>
                      {triggerModes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Pontos" hint="Mínimo 1">{(id) => <input id={id} required type="number" min="1" className="field font-bold" value={form.points} onChange={(e) => set({ points: e.target.value })} />}</Field>
              </div>
              <Field label="Categoria">
                {(id) => (
                  <select id={id} className="field" value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    {categories.filter((c) => c.id !== 'ALL').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </Section>

          <Section title={style === 'padrao' ? 'Opções da missão' : `Opções do estilo ${meta.label}`} subtitle="Como a pessoa conclui e o que muda no card.">
            <div className="flex flex-col gap-3.5">
              {form.triggerMode === 'secret' && (
                <div className="grid gap-3.5 lg:grid-cols-2">
                  <Field label="Palavra-chave" hint="Só o admin vê. O participante digita para concluir.">
                    {(id) => <input id={id} required className="field font-semibold tracking-[2px]" placeholder="OPORTUNIDADES" value={form.secretWord} onChange={(e) => set({ secretWord: e.target.value.toUpperCase() })} />}
                  </Field>
                  {style === 'secreta' && (
                    <Field label="Dica que aparece borrada" hint="Fica borrada no card até alguém resolver.">
                      {(id) => <input id={id} className="field" value={opts.hint || ''} onChange={(e) => opt({ hint: e.target.value })} />}
                    </Field>
                  )}
                </div>
              )}
              {style === 'secreta' && <SwitchRow title={'Brilhos e "?" animados'} hint="Some quando o celular pede menos movimento" checked={opts.sparkles !== false} onChange={(v) => opt({ sparkles: v })} />}
              {style === 'caca-qr' && <Field label="Termina às" hint="Mostrado no card como prazo.">{(id) => <input id={id} type="time" className="field font-bold" value={opts.deadline || ''} onChange={(e) => opt({ deadline: e.target.value })} />}</Field>}
              {style === 'patrocinador' && (
                <Field label="Cota">
                  {(id) => <select id={id} className="field" value={opts.tier || 'diamante'} onChange={(e) => opt({ tier: e.target.value })}>{TIERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
                </Field>
              )}

              {form.triggerMode === 'qr' && (
                <div className="rounded-2xl border border-line-2 bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-extrabold text-text">Validação por QR Code Físico</div>
                      <div className="text-[12px] text-text-3">Imprima e fixe este QR Code no estande ou cartaz do evento.</div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-action/15 px-2.5 py-1 text-[11px] font-bold text-link">
                      <QrCode size={13} /> Totem / Estande
                    </span>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field label="Token ou Código do QR" hint="Identificador único embutido no QR Code">
                      {(id) => (
                        <input
                          id={id}
                          required
                          className="field font-mono font-bold tracking-wider"
                          placeholder="Ex: TW_MISSAO_KANASTRA_STAND"
                          value={form.qrCodeValue || ''}
                          onChange={(e) => set({ qrCodeValue: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                        />
                      )}
                    </Field>
                    <Field label="Instrução para o Participante" hint="Orientação exibida no app">
                      {(id) => (
                        <input
                          id={id}
                          className="field"
                          placeholder="Ex: Escaneie no estande da Kanastra"
                          value={form.qrInstruction || ''}
                          onChange={(e) => set({ qrInstruction: e.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface-raised p-4 sm:flex-row sm:justify-start">
                    <div className="flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
                      <QRCodeSVG
                        id="mission-qr-svg-preview"
                        value={effectiveQrValue}
                        size={120}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex flex-1 flex-col items-start gap-2 text-center sm:text-left">
                      <div className="text-[13px] font-extrabold text-text">Cartaz / Totem para Impressão</div>
                      <p className="m-0 text-[12px] leading-relaxed text-text-3">
                        Gere uma arte de alta resolução (1000x1350px 300DPI) pronta para impressão com moldura TechWeek, pontos em destaque e instruções para o participante.
                      </p>
                      <button
                        type="button"
                        onClick={handleDownloadQrPng}
                        disabled={downloadingQr}
                        className={btn('action', 'mt-1 text-[13px] font-bold')}
                      >
                        <Download size={15} />
                        {downloadingQr ? 'Gerando PNG...' : 'Baixar QR Code (PNG)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {form.triggerMode === 'quiz' && (
                <>
                  <Field label="Pergunta">{(id) => <input id={id} required className="field" placeholder="Ex: Qual tecnologia a empresa mais usa?" value={form.quizQuestion} onChange={(e) => set({ quizQuestion: e.target.value })} />}</Field>
                  <fieldset className="m-0 border-0 p-0">
                    <legend className="field-label">Alternativas (marque a correta)</legend>
                    <div className="flex flex-col gap-2">
                      {form.quizOptions.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name="correctOption" aria-label={`Alternativa ${i + 1} é a correta`} checked={form.quizCorrectIndex === i} onChange={() => set({ quizCorrectIndex: i })} className="h-5 w-5 shrink-0 accent-[#3D50E6]" />
                          <input required aria-label={`Alternativa ${i + 1}`} className="field flex-1" placeholder={`Alternativa ${i + 1}`} value={o} onChange={(e) => set({ quizOptions: form.quizOptions.map((x, j) => (j === i ? e.target.value : x)) })} />
                          {form.quizOptions.length > 2 && (
                            <button type="button" aria-label={`Remover alternativa ${i + 1}`} className={`${ICON_BTN} h-11 w-11 bg-transparent text-err`} onClick={() => set({ quizOptions: form.quizOptions.filter((_, j) => j !== i), quizCorrectIndex: 0 })}><X size={16} aria-hidden="true" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {form.quizOptions.length < 5 && (
                      <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-link" onClick={() => set({ quizOptions: [...form.quizOptions, ''] })}><Plus size={16} aria-hidden="true" /> Adicionar alternativa</button>
                    )}
                  </fieldset>
                </>
              )}

              {form.triggerMode === 'form' && (
                <div>
                  <div className="field-label">Campos da resposta ({form.fields.length})</div>
                  <div className="flex flex-col gap-2">
                    {form.fields.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-2 rounded-xl bg-surface-raised p-2">
                        <input required aria-label="Pergunta ou rótulo" className="field min-w-0 flex-[2]" placeholder="Pergunta" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                        <select aria-label="Tipo de resposta" className="field min-w-0 flex-1" value={f.type} onChange={(e) => setField(i, { type: e.target.value })}>
                          <option value="text">Texto curto</option>
                          <option value="textarea">Texto longo</option>
                          <option value="photo">Foto</option>
                          <option value="select">Múltipla escolha</option>
                        </select>
                        <button type="button" aria-label={`Remover campo ${i + 1}`} className={`${ICON_BTN} h-11 w-11 shrink-0 bg-transparent text-err`} onClick={() => set({ fields: form.fields.filter((_, j) => j !== i) })}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-link" onClick={() => set({ fields: [...form.fields, { id: `f_${Date.now()}`, label: 'Nova pergunta', type: 'text', required: true }] })}><Plus size={16} aria-hidden="true" /> Adicionar campo</button>
                </div>
              )}

              {form.triggerMode === 'auto' && (
                <Field label="Evento que conclui">
                  {(id) => (
                    <select id={id} className="field" value={form.autoEventType} onChange={(e) => set({ autoEventType: e.target.value })}>
                      <option value="sponsor_visit">Escanear estande de patrocinador</option>
                      <option value="lecture_checkin">Check-in presencial em atividade</option>
                      <option value="network_first">Primeira conexão no app</option>
                      <option value="network_course">Conectar com aluno de outro curso</option>
                      <option value="network_external">Conectar com pessoa de outra instituição ou empresa</option>
                      <option value="network_freshman">Conectar com calouro (1º período)</option>
                      <option value="passport_complete">Completar o passaporte de patrocinadores</option>
                    </select>
                  )}
                </Field>
              )}

              {style === 'relampago' && (
                <div className="grid gap-3.5 lg:grid-cols-2">
                  <Field label="Duração (minutos)">{(id) => <input id={id} type="number" min="1" max="60" className="field font-bold" value={form.flashDuration} onChange={(e) => set({ flashDuration: e.target.value })} />}</Field>
                  <Field label="Limite de vencedores" hint="Vazio = ilimitado">{(id) => <input id={id} type="number" min="1" className="field" value={form.flashMaxWinners} onChange={(e) => set({ flashMaxWinners: e.target.value })} />}</Field>
                  <Field label="Frase do mascote" className="lg:col-span-2">{(id) => <input id={id} className="field" value={form.flashMascotDialogue} onChange={(e) => set({ flashMascotDialogue: e.target.value })} />}</Field>
                </div>
              )}
            </div>
          </Section>
        </form>

        <div className="order-1 lg:order-2 lg:sticky lg:top-5">
          <div className="mb-2.5 text-[13px] font-extrabold text-text-2">Como aparece no app</div>
          <div className="rounded-[28px] border border-line-2 bg-bg py-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.5)] lg:pb-5">
            <div className="mx-5 mb-2.5 flex justify-between text-[12px] font-extrabold text-text-3"><span>Disponíveis</span><span>prévia</span></div>
            <div className="mx-[15px]"><MissionPreview form={form} /></div>
          </div>
          <p className="m-0 mx-1 mt-3 text-[12px] leading-relaxed text-text-4">A prévia atualiza enquanto você edita. Os pontos e o botão usam o padrão do app.</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-nav px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <button type="submit" form={FORM_ID} disabled={saving} className={btn('action', 'h-[52px] flex-1 text-[16px] font-extrabold')}><Check size={18} aria-hidden="true" /> {submitLabel}</button>
      </div>
    </>
  );
}
