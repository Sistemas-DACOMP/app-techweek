import { useState } from 'react';
import { Plus, Zap, RefreshCw, Pencil, Trash2, Search, QrCode, Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { btn, ICON_BTN, PageHead, Kpi, Switch, Chip, MoreMenu, EmptyState } from './ui';
import { CARD_STYLES, STYLE_BY_KEY, styleOfMission } from './MissionPreview';

/* 2.05 Missões (lista). Mesmos filtros e ações de antes; só a apresentação mudou. */

const TRIGGER_LABEL = { form: 'Formulário', secret: 'Palavra secreta', quiz: 'Quiz', auto: 'Automático', qr: 'QR Code Físico' };
const howCompletes = (m) => (m.triggerMode === 'form' && (m.fields || []).some((f) => f.type === 'photo') ? 'Foto' : TRIGGER_LABEL[m.triggerMode] || 'Formulário');
const isOn = (m) => (m.status || 'active') === 'active';

export default function AdminMissoes({
  missions, all, loading, categories, category, onCategory, status, onStatus, search, onSearch,
  seeding, onSeed, onNew, onFlash, onEdit, onToggle, onDelete,
}) {
  const [qrModalMission, setQrModalMission] = useState(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const active = all.filter(isOn).length;
  const flash = all.filter((m) => m.isFlash).length;
  const totalPts = all.filter(isOn).reduce((s, m) => s + (Number(m.points) || 0), 0);

  const downloadMissionQrPng = async (m) => {
    if (!m) return;
    setDownloadingQr(true);
    try {
      const svgElem = document.getElementById('modal-mission-qr-svg');
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
      const cleanTitle = (m.title || m.name || 'Missão Especial TechWeek').slice(0, 32);
      ctx.fillText(cleanTitle, width / 2, 160);

      // Badge de XP Violeta
      const ptsText = `+${Number(m.points) || 50} PTS XP`;
      ctx.font = '800 28px Montserrat, sans-serif';
      const ptsWidth = ctx.measureText(ptsText).width + 60;
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.roundRect((width - ptsWidth) / 2, 195, ptsWidth, 54, 27);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ptsText, width / 2, 232);

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(175, 290, 650, 650, 40);
        ctx.fill();

        ctx.drawImage(img, 220, 335, 560, 560);
        URL.revokeObjectURL(blobUrl);

        ctx.fillStyle = '#EEF1FA';
        ctx.font = 'bold 36px Montserrat, sans-serif';
        ctx.fillText('Escaneie com o app TechWeek', width / 2, 1020);

        ctx.fillStyle = '#A9B1CC';
        ctx.font = '600 24px Montserrat, sans-serif';
        ctx.fillText('Abra o app > Crachá > Escanear', width / 2, 1070);

        const qrVal = m.qrCodeValue || `TW_MISSAO_${m.id || 'TECHWEEK'}`;
        ctx.fillStyle = '#6E779A';
        ctx.font = '500 18px Montserrat, sans-serif';
        ctx.fillText(`Token de Validação: ${qrVal}`, width / 2, 1140);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-missao-${(m.title || 'techweek').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();
        setDownloadingQr(false);
      };
      img.src = blobUrl;
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
      setDownloadingQr(false);
    }
  };

  return (
    <div className="pb-8">
      <PageHead title="Missões" subtitle={`${all.length} missões${flash ? ` · ${flash} relâmpago` : ''}`}>
        <button type="button" className={btn('secondary')} onClick={onSeed} disabled={seeding}>
          <RefreshCw size={18} aria-hidden="true" className={seeding ? 'animate-spin' : ''} /> {seeding ? 'Sincronizando' : 'Popular missões padrão'}
        </button>
        <button type="button" className={btn('secondary')} onClick={() => onFlash()}><Zap size={18} aria-hidden="true" /> Missão relâmpago</button>
        <button type="button" className={btn('action')} onClick={onNew}><Plus size={18} aria-hidden="true" /> Nova missão</button>
      </PageHead>

      <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
        <button type="button" className={btn('secondary', 'flex-1')} onClick={() => onFlash()}><Zap size={18} aria-hidden="true" /> Relâmpago</button>
        <button type="button" className={btn('secondary', 'flex-1')} onClick={onSeed} disabled={seeding}><RefreshCw size={18} aria-hidden="true" /> Popular</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        <Kpi label="Missões ativas" value={active} />
        <Kpi label="Relâmpago" value={flash} />
        <div className="col-span-2 sm:col-span-1">
          <Kpi label="Pontos disponíveis" value={totalPts.toLocaleString('pt-BR')} />
        </div>
      </div>

      <div className="adm-noscroll -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
        {categories.map((c) => <Chip key={c.id} selected={category === c.id} dot={c.id === 'ALL' ? undefined : c.color} onClick={() => onCategory(c.id)}>{c.id === 'ALL' ? 'Todas' : c.label}</Chip>)}
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 focus-within:border-link">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar missão</span>
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por título, descrição ou palavra-chave" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-text-4" />
        </label>
        <select aria-label="Filtrar por status" className="field h-11 w-full sm:w-auto" value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="ALL">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="paused">Pausadas</option>
        </select>
      </div>

      {/* Tabela (desktop) */}
      <div className="mt-4 hidden overflow-x-auto rounded-[20px] bg-surface px-2 pb-1 pt-4 lg:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              {['Missão', 'Como completa', 'Pontos', 'Ativa'].map((h) => <th key={h} className="px-3 pb-3 text-left text-[12px] font-bold text-text-3">{h}</th>)}
              <th className="px-3 pb-3 text-left"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5}><EmptyState>Carregando missões...</EmptyState></td></tr>}
            {!loading && missions.length === 0 && <tr><td colSpan={5}><EmptyState>Nenhuma missão com esses filtros.</EmptyState></td></tr>}
            {missions.map((m) => {
              const meta = STYLE_BY_KEY[styleOfMission(m)] || CARD_STYLES[0];
              const Icon = meta.icon;
              const name = m.title || m.name || 'Missão';
              return (
                <tr key={m.id} className="border-t border-line">
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.color}24`, color: meta.color }}><Icon size={18} aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold">{name}</span>
                        <span className="block text-[12px] text-text-3">{meta.label}</span>
                      </span>
                    </span>
                  </td>
                  <td className="p-3"><span className="whitespace-nowrap rounded-[10px] bg-surface-raised px-2.5 py-1 text-[12px] font-bold text-text-2">{howCompletes(m)}</span></td>
                  <td className="p-3"><span className="rounded-[10px] bg-[rgba(124,58,237,0.22)] px-2.5 py-1 text-[13px] font-extrabold text-[#D6CBFF]">+{Number(m.points) || 0}</span></td>
                  <td className="p-3"><Switch checked={isOn(m)} label={`Missão ${name} ativa`} onChange={() => onToggle(m)} /></td>
                  <td className="whitespace-nowrap p-3">
                    <span className="inline-flex gap-1.5">
                      {m.triggerMode === 'qr' && (
                        <button
                          type="button"
                          aria-label={`Baixar QR Code de ${name}`}
                          title="Baixar QR Code do Estande/Totem"
                          className={`${ICON_BTN} text-link`}
                          onClick={() => setQrModalMission(m)}
                        >
                          <QrCode size={16} aria-hidden="true" />
                        </button>
                      )}
                      <button type="button" aria-label={`Editar ${name}`} title="Editar missão" className={ICON_BTN} onClick={() => onEdit(m)}><Pencil size={16} aria-hidden="true" /></button>
                      <MoreMenu label={`Mais ações de ${name}`} items={[
                        { label: 'Baixar QR Code (PNG)', icon: QrCode, onClick: () => setQrModalMission(m) },
                        { label: 'Disparar como relâmpago', icon: Zap, onClick: () => onFlash(m) },
                        { label: 'Excluir missão', icon: Trash2, danger: true, onClick: () => onDelete(m) },
                      ]} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards (celular) */}
      <div className="mt-4 flex flex-col gap-3 lg:hidden">
        {loading && <EmptyState>Carregando missões...</EmptyState>}
        {!loading && missions.length === 0 && <EmptyState>Nenhuma missão com esses filtros.</EmptyState>}
        {missions.map((m) => {
          const meta = STYLE_BY_KEY[styleOfMission(m)] || CARD_STYLES[0];
          const Icon = meta.icon;
          const name = m.title || m.name || 'Missão';
          return (
            <article key={m.id} className="rounded-[18px] border border-line bg-surface p-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.color}24`, color: meta.color }}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-text">{name}</span>
                    <span className="block truncate text-[12px] text-text-3">{meta.label} · {howCompletes(m)}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-[10px] bg-[rgba(124,58,237,0.22)] px-2.5 py-1 text-[13px] font-extrabold text-[#D6CBFF]">
                  +{Number(m.points) || 0}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                <div className="flex items-center gap-2">
                  <Switch checked={isOn(m)} label={`Missão ${name} ativa`} onChange={() => onToggle(m)} />
                  <span className="text-[12px] font-semibold text-text-2">{isOn(m) ? 'Ativa' : 'Pausada'}</span>
                </div>
                <span className="inline-flex gap-1.5">
                  {m.triggerMode === 'qr' && (
                    <button
                      type="button"
                      aria-label={`Baixar QR Code de ${name}`}
                      title="Baixar QR Code do Estande/Totem"
                      className={`${ICON_BTN} text-link`}
                      onClick={() => setQrModalMission(m)}
                    >
                      <QrCode size={16} aria-hidden="true" />
                    </button>
                  )}
                  <button type="button" aria-label={`Editar ${name}`} title="Editar missão" className={ICON_BTN} onClick={() => onEdit(m)}><Pencil size={16} aria-hidden="true" /></button>
                  <MoreMenu label={`Mais ações de ${name}`} items={[
                    { label: 'Baixar QR Code (PNG)', icon: QrCode, onClick: () => setQrModalMission(m) },
                    { label: 'Disparar como relâmpago', icon: Zap, onClick: () => onFlash(m) },
                    { label: 'Excluir missão', icon: Trash2, danger: true, onClick: () => onDelete(m) },
                  ]} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de Prévia e Download do QR Code da Missão */}
      {qrModalMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[24px] border border-line-2 bg-surface p-6 shadow-2xl">
            <button
              type="button"
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-text-3 hover:text-text"
              onClick={() => setQrModalMission(null)}
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <span className="inline-block rounded-full bg-action/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-link">
                QR Code para Totem / Estande
              </span>
              <h3 className="m-0 mt-2 text-[20px] font-black text-text">
                {qrModalMission.title || qrModalMission.name || 'Missão'}
              </h3>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="rounded-[8px] bg-[#7C3AED]/20 px-2 py-0.5 text-[12px] font-black text-[#D6CBFF]">
                  +{Number(qrModalMission.points) || 50} PTS XP
                </span>
                <span className="text-[12px] text-text-3 font-medium">
                  {qrModalMission.qrInstruction || 'Escaneie no local'}
                </span>
              </div>
            </div>

            <div className="my-6 flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-inner">
              <QRCodeSVG
                id="modal-mission-qr-svg"
                value={qrModalMission.qrCodeValue || `TW_MISSAO_${qrModalMission.id || 'TECHWEEK'}`}
                size={200}
                level="H"
                includeMargin={false}
              />
              <div className="mt-3 font-mono text-[11px] font-bold text-slate-600">
                {qrModalMission.qrCodeValue || `TW_MISSAO_${qrModalMission.id || 'TECHWEEK'}`}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={downloadingQr}
                onClick={() => downloadMissionQrPng(qrModalMission)}
                className={btn('action', 'w-full py-3 text-[14px] font-black')}
              >
                <Download size={16} />
                {downloadingQr ? 'Gerando Cartaz PNG...' : 'Baixar Cartaz com QR Code (PNG)'}
              </button>
              <button
                type="button"
                onClick={() => setQrModalMission(null)}
                className={btn('quiet', 'w-full text-[13px]')}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
