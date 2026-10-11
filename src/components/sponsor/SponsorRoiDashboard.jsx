import { useState, useMemo } from 'react';
import { 
  Download, 
  Printer, 
  TrendingUp, 
  GraduationCap, 
  Layers,
  Building2,
  Users
} from 'lucide-react';
import iconeTw from '../../assets/icone.png';
import { calculateSponsorRoi, exportLeadsToCsv } from '../../lib/sponsorService';

/**
 * Dashboard Executivo de ROI e Talentos Pós-Evento para Patrocinadores.
 * Inclui métricas demográficas, funil de conversão e exportação nativa para impressão/PDF.
 */
export default function SponsorRoiDashboard({
  leads = [],
  allCompanyLeads,
  myLeads = [],
  companyName = 'Patrocinador',
  companyLogo = null,
  totalEventAttendees = 600,
  scope: initialScope = 'company',
  onScopeChange,
  onClose,
  showActions = true,
  onExportCsv
}) {
  const companyList = allCompanyLeads || leads || [];
  const [internalScope, setInternalScope] = useState(initialScope);
  const activeScope = onScopeChange ? initialScope : internalScope;

  const handleScopeSelect = (newScope) => {
    if (onScopeChange) {
      onScopeChange(newScope);
    } else {
      setInternalScope(newScope);
    }
  };

  const activeLeads = activeScope === 'mine' ? (myLeads || []) : companyList;

  const roi = useMemo(() => {
    return calculateSponsorRoi(activeLeads, totalEventAttendees);
  }, [activeLeads, totalEventAttendees]);

  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv(activeLeads, activeScope);
    } else {
      exportLeadsToCsv(activeLeads, companyName, activeScope === 'mine' ? 'roi_meus_leads' : 'roi_empresa');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="sponsor-roi-dashboard flex flex-col gap-4 sm:gap-5">
      {/* Formal Printable Header (A4 Print / PDF only) */}
      <div className="hidden print:flex items-center justify-between border-b border-border/80 pb-5 mb-3">
        <div className="flex items-center gap-3.5">
          <img src={iconeTw} alt="TechWeek 2026" className="h-11 w-[42px] object-contain shrink-0" />
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-link">
              <span>TechWeek 2026</span>
              <span>•</span>
              <span>Relatório Oficial de Patrocínio</span>
            </div>
            <h1 className="mt-0.5 text-[22px] font-black tracking-tight text-text">
              Performance de Talentos • {companyName}
            </h1>
            <div className="mt-0.5 text-[11px] text-text-3">
              Métricas consolidadas do estande • {activeScope === 'mine' ? 'Meus Leads' : 'Toda a Empresa'} • {roi.totalLeads} {roi.totalLeads === 1 ? 'conexão capturada' : 'conexões capturadas'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          {companyLogo ? (
            <div className="flex h-12 max-w-[180px] items-center justify-center rounded-xl bg-surface-raised/80 px-3.5 py-1.5 border border-white/10">
              <img
                src={companyLogo}
                alt={companyName}
                className="max-h-9 max-w-full object-contain filter brightness-0 invert"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-surface-raised/80 px-3.5 py-2 border border-white/10">
              <Building2 size={18} className="text-link" />
              <span className="text-[14px] font-black uppercase tracking-wider text-text">
                {companyName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clean Executive Header (Screen only - mobile & desktop) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0 text-[18px] sm:text-[20px] font-extrabold tracking-tight text-text">
              Performance • {companyName}
            </h2>
            {companyLogo && (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-5 max-w-[80px] object-contain filter brightness-0 invert opacity-75 hidden sm:inline-block"
              />
            )}
          </div>
          <p className="m-0 mt-0.5 text-[12px] text-text-3">
            {roi.totalLeads} {roi.totalLeads === 1 ? 'conexão registrada' : 'conexões registradas'} no estande • {totalEventAttendees} no evento
          </p>
        </div>

        {/* Seletor de Escopo do Relatório: Toda a Empresa vs Meus Leads */}
        <div role="tablist" aria-label="Filtrar escopo do relatório" className="flex items-center gap-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeScope === 'company'}
            onClick={() => handleScopeSelect('company')}
            className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              activeScope === 'company'
                ? 'bg-surface-selected text-text border border-link/40 shadow-xs'
                : 'bg-surface-raised/40 text-text-3 hover:text-text-2 border border-transparent'
            }`}
          >
            <Building2 size={13} className={activeScope === 'company' ? 'text-link' : 'text-text-3'} />
            <span>Toda a Empresa</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeScope === 'company'
                  ? 'bg-link/20 text-link'
                  : 'bg-surface-raised text-text-4'
              }`}
            >
              {companyList.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeScope === 'mine'}
            onClick={() => handleScopeSelect('mine')}
            className={`press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              activeScope === 'mine'
                ? 'bg-surface-selected text-text border border-link/40 shadow-xs'
                : 'bg-surface-raised/40 text-text-3 hover:text-text-2 border border-transparent'
            }`}
          >
            <Users size={13} className={activeScope === 'mine' ? 'text-link' : 'text-text-3'} />
            <span>Meus Leads</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeScope === 'mine'
                  ? 'bg-link/20 text-link'
                  : 'bg-surface-raised text-text-4'
              }`}
            >
              {myLeads.length}
            </span>
          </button>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={activeLeads.length === 0}
              className="press inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-selected px-3 text-[12px] font-bold text-text hover:bg-surface-raised disabled:opacity-40 transition-colors"
              title="Exportar dados de ROI em CSV"
            >
              <Download size={14} aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="press inline-flex h-9 items-center gap-1.5 rounded-xl bg-action px-3 text-[12px] font-bold text-white hover:brightness-110 shadow-xs transition-colors"
              title="Imprimir relatório ou salvar em PDF"
            >
              <Printer size={14} aria-hidden="true" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border-t-[3px] border-[#8FA0FF] border border-border bg-surface p-3.5 sm:p-4">
          <div className="text-[11px] sm:text-[12px] font-bold text-text-2">Leads no Estande</div>
          <div className="mt-1.5 text-[24px] sm:text-[28px] font-extrabold tabular-nums text-text">{roi.totalLeads}</div>
          <div className="mt-1 text-[11px] text-text-3">alunos conectados</div>
        </div>

        <div className="rounded-2xl border-t-[3px] border-[#C084FC] border border-border bg-surface p-4">
          <div className="text-[12px] font-bold text-text-2">Qualificação Técnica</div>
          <div className="mt-2 text-[28px] font-black text-[#C084FC]">{roi.qualificationRate}%</div>
          <div className="mt-1 text-[11px] text-text-3">
            {roi.qualifiedCount} perfis 4★ e 5★
          </div>
        </div>

        <div className="rounded-2xl border-t-[3px] border-[#6FD8A6] border border-border bg-surface p-4">
          <div className="text-[12px] font-bold text-text-2">Penetração no Evento</div>
          <div className="mt-2 text-[28px] font-black text-[#6FD8A6]">{roi.penetrationRate}%</div>
          <div className="mt-1 text-[11px] text-text-3">dos inscritos na TechWeek</div>
        </div>

        <div className="rounded-2xl border-t-[3px] border-[#FBBF24] border border-border bg-surface p-4">
          <div className="text-[12px] font-bold text-text-2">Perfis com GitHub</div>
          <div className="mt-2 text-[28px] font-black text-[#FBBF24]">
            {roi.totalLeads > 0 ? Math.round((roi.withGithubCount / roi.totalLeads) * 100) : 0}%
          </div>
          <div className="mt-1 text-[11px] text-text-3">
            {roi.withGithubCount} com portfólio
          </div>
        </div>
      </div>

      {/* Demographic Breakdown & Qualification Funnel */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Distribuição por Cursos */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-link" />
            <span className="text-[14px] font-extrabold text-text">Distribuição por Graduação</span>
          </div>

          <div className="mt-1 flex flex-col gap-2.5">
            {roi.courses.slice(0, 5).map((course) => (
              <div key={course.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-[12px] font-bold">
                  <span className="truncate text-text">{course.name}</span>
                  <span className="shrink-0 text-text-3">
                    {course.count} ({course.percent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5]"
                    style={{ width: `${course.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maturidade Acadêmica / Período */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#C084FC]" />
            <span className="text-[14px] font-extrabold text-text">Maturidade Acadêmica</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="rounded-xl border border-border/80 bg-surface-raised/50 p-3">
              <div className="text-[11px] font-bold text-text-3">Início (1º ao 3º P)</div>
              <div className="mt-1 text-[20px] font-black text-text">
                {roi.periods.inicio}
              </div>
              <div className="text-[10px] text-text-4">Foco em estágio inicial</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-raised/50 p-3">
              <div className="text-[11px] font-bold text-text-3">Meio (4º ao 6º P)</div>
              <div className="mt-1 text-[20px] font-black text-link">
                {roi.periods.meio}
              </div>
              <div className="text-[10px] text-text-4">Momento ideal de estágio</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-raised/50 p-3">
              <div className="text-[11px] font-bold text-text-3">Formandos (7º ao 10º P)</div>
              <div className="mt-1 text-[20px] font-black text-[#6FD8A6]">
                {roi.periods.conclusao}
              </div>
              <div className="text-[10px] text-text-4">Prontos para Jr / CLT</div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-raised/50 p-3">
              <div className="text-[11px] font-bold text-text-3">Pós-Graduação & Outros</div>
              <div className="mt-1 text-[20px] font-black text-[#C084FC]">
                {roi.periods.posGrad + roi.periods.outro}
              </div>
              <div className="text-[10px] text-text-4">Mestrado, Doutorado e Externos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Funil de Qualificação do Estande */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-[#6FD8A6]" />
          <span className="text-[14px] font-extrabold text-text">Funil de Qualificação de Talentos</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-1">
          <div className="rounded-xl border border-border bg-surface-raised/40 p-3 text-center">
            <div className="text-[11px] font-bold text-text-3">1. Visitantes</div>
            <div className="mt-1 text-[22px] font-black text-text">{roi.ratingFunnel.total}</div>
            <div className="text-[10px] text-text-4">100% capturados</div>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised/40 p-3 text-center">
            <div className="text-[11px] font-bold text-text-3">2. Com WhatsApp</div>
            <div className="mt-1 text-[22px] font-black text-link">
              {roi.ratingFunnel.contactable}
            </div>
            <div className="text-[10px] text-text-4">
              {roi.totalLeads > 0 ? Math.round((roi.ratingFunnel.contactable / roi.totalLeads) * 100) : 0}% contatáveis
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised/40 p-3 text-center">
            <div className="text-[11px] font-bold text-text-3">3. Avaliados</div>
            <div className="mt-1 text-[22px] font-black text-[#8FA0FF]">
              {roi.ratingFunnel.evaluated}
            </div>
            <div className="text-[10px] text-text-4">com nota em estrelas</div>
          </div>

          <div className="rounded-xl border border-border bg-surface-raised/40 p-3 text-center">
            <div className="text-[11px] font-bold text-text-3">4. Qualificados (4★+)</div>
            <div className="mt-1 text-[22px] font-black text-[#C084FC]">
              {roi.ratingFunnel.qualified}
            </div>
            <div className="text-[10px] text-text-4">fit técnico alto</div>
          </div>

          <div className="rounded-xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 p-3 text-center">
            <div className="text-[11px] font-bold text-[#FBBF24]">5. Destaques (5★)</div>
            <div className="mt-1 text-[22px] font-black text-[#FBBF24]">
              {roi.ratingFunnel.destaques}
            </div>
            <div className="text-[10px] font-bold text-[#FBBF24]/80">top candidatos</div>
          </div>
        </div>
      </div>

      {/* Top Tags & Equipe do Estande */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Tags */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="text-[14px] font-extrabold text-text">Especialidades & Tags Mais Frequentes</span>
          {roi.tags.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-text-4">
              Nenhuma tag foi atribuída aos leads ainda.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roi.tags.map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-[12px] font-bold text-text-2"
                >
                  <span>{t.tag}</span>
                  <span className="rounded-md bg-link/15 px-1.5 py-0.2 text-[10px] font-black text-link">
                    {t.count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Equipe do Estande */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <span className="text-[14px] font-extrabold text-text">Produtividade da Equipe</span>
          <div className="flex flex-col gap-2">
            {roi.attendants.map((att) => (
              <div
                key={att.email}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-raised/40 px-3 py-2 text-[12px]"
              >
                <span className="font-bold text-text">{att.name}</span>
                <span className="text-text-3">
                  <strong className="text-text">{att.count}</strong> scans ({att.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formal Printable Footer (A4 Print / PDF only) */}
      <div className="hidden print:flex items-center justify-between border-t border-border/60 pt-4 mt-4 text-[10px] text-text-4">
        <div>
          <span>TechWeek 2026 • Painel do Patrocinador • Relatório emitido em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        <div>
          <span>Confidencial • {companyName}</span>
        </div>
      </div>
    </div>
  );
}

