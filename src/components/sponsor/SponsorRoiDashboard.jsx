import { useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  TrendingUp, 
  Users, 
  Star, 
  GraduationCap, 
  CheckCircle2, 
  Sparkles,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GitHubIcon } from '../ParticipantCard';
import { calculateSponsorRoi, exportLeadsToCsv } from '../../lib/sponsorService';
import Mascot from '../Mascot';

/**
 * Dashboard Executivo de ROI e Talentos Pós-Evento para Patrocinadores.
 * Inclui métricas demográficas, funil de conversão e exportação nativa para impressão/PDF.
 */
export default function SponsorRoiDashboard({
  leads = [],
  companyName = 'Patrocinador',
  companyLogo = null,
  totalEventAttendees = 600,
  onClose
}) {
  const roi = useMemo(() => {
    return calculateSponsorRoi(leads, totalEventAttendees);
  }, [leads, totalEventAttendees]);

  const handleExportCsv = () => {
    exportLeadsToCsv(leads, companyName, 'roi_executivo');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="sponsor-roi-dashboard flex flex-col gap-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-link/15 text-link">
            <BarChart3 size={20} />
          </span>
          <div>
            <h2 className="m-0 text-[16px] font-black text-text">
              Relatório Executivo de ROI & Talentos
            </h2>
            <p className="m-0 text-[12px] text-text-3">
              Métricas consolidadas do estande da {companyName} na FACOM TechWeek 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="press inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 text-[13px] font-bold text-text hover:bg-surface-selected"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-action px-4 text-[13px] font-bold text-white hover:brightness-110 shadow-[0_4px_16px_rgba(61,80,230,0.3)]"
          >
            <Printer size={15} />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-link">
            <span>TechWeek 2026</span>
            <span>•</span>
            <span>Relatório Oficial de Patrocínio</span>
          </div>
          <h1 className="mt-1 text-[24px] font-black tracking-tight text-text">
            Performance de Talentos • {companyName}
          </h1>
          <div className="mt-1 text-[12px] text-text-3">
            Amostra de {roi.totalLeads} conexões no estande
          </div>
        </div>

        {companyLogo && (
          <div className="flex h-12 w-28 items-center justify-end">
            <img
              src={companyLogo}
              alt={companyName}
              className="max-h-10 max-w-full object-contain filter brightness-0 invert opacity-90"
            />
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border-t-[3px] border-[#8FA0FF] border border-border bg-surface p-4">
          <div className="text-[12px] font-bold text-text-2">Leads no Estande</div>
          <div className="mt-2 text-[28px] font-black text-text">{roi.totalLeads}</div>
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
    </div>
  );
}

