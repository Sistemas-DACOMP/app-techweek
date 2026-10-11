import { useState, useMemo } from 'react';
import {
  ChevronDown, Check, Search, GraduationCap, Download, CheckCircle2,
  AlertTriangle, Clock, Users, ShieldCheck, Filter
} from 'lucide-react';
import { ROLE_COLORS, ROLE_LABELS } from '../../components/RoleSwitcher';
import { PageHead, Chip, EmptyState, Kpi, btn } from './ui';
import { calculateUfuExtensionAudit, exportUfuAuditCsv } from '../../lib/liveOpsService';

/* 2.04 Participantes e papéis (desktop) e 2.12 Pessoas (celular) + Auditoria UFU 75% */

const ROLE_KEYS = ['PARTICIPANT', 'STAFF', 'SPONSOR', 'ADMIN'];
const FILTERS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PARTICIPANT', label: 'Participantes', short: 'Particip.' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'SPONSOR', label: 'Patrocinadores', short: 'Patroc.' },
  { key: 'ADMIN', label: 'Admin' },
];
const AVATAR_BG = ['#2A3570', '#4C2A85', '#1E5A6B', '#7A3A22', '#2C5E3F', '#6B2D5C'];

export const roleOf = (u) => (ROLE_KEYS.includes(u.role) ? u.role : 'PARTICIPANT');
export const nameOf = (u) => u.fullName || u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Participante TechWeek';
const handleOf = (u) => (u.username ? `@${u.username}` : u.email ? `@${u.email.split('@')[0]}` : '');
const initialsOf = (n) => n.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const bgFor = (s = '') => AVATAR_BG[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length];

function courseOf(u) {
  const r = roleOf(u);
  if (r === 'SPONSOR') return 'Patrocinador';
  if (u.course) return `${u.course}${u.period ? ` · ${String(u.period).replace(/º$/, '')}º` : ''}`;
  return u.participantType || '—';
}

function RoleSelect({ user, onChange }) {
  const role = roleOf(user);
  const color = ROLE_COLORS[role];
  return (
    <span
      className="press relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[13px] font-extrabold focus-within:outline focus-within:outline-2 focus-within:outline-link lg:h-11 lg:pl-3.5 lg:text-[14px]"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, var(--surface))` }}
    >
      {ROLE_LABELS[role]}
      <ChevronDown size={15} aria-hidden="true" />
      <select
        aria-label={`Papel de ${nameOf(user)}`}
        value={role}
        onChange={(e) => onChange(user, e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}
      </select>
    </span>
  );
}

function Avatar({ user, size = 38 }) {
  const n = nameOf(user);
  return user.avatarUrl
    ? <img src={user.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold" style={{ width: size, height: size, background: bgFor(n) }}>{initialsOf(n)}</span>;
}

export default function AdminPessoas({
  usersList,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  onChangeRole,
  activities = [],
}) {
  const [activeTab, setActiveTab] = useState('papéis'); // 'papéis' | 'auditoria_ufu'
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL' | 'ELIGIBLE' | 'INELIGIBLE'
  const [auditSearch, setAuditSearch] = useState('');

  // 1. Filtragem da aba tradicional de Papéis
  const q = userSearch.toLowerCase();
  const list = usersList.filter((u) => {
    const match = nameOf(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    return match && (userRoleFilter === 'ALL' || roleOf(u) === userRoleFilter);
  });
  const count = (k) => (k === 'ALL' ? usersList.length : usersList.filter((u) => roleOf(u) === k).length);
  const noTicket = usersList.filter((u) => roleOf(u) === 'PARTICIPANT' && !u.hasSymplaTicket).length;

  // 2. Cálculo da Auditoria UFU (Regra 75%)
  const auditData = useMemo(() => {
    return calculateUfuExtensionAudit(usersList, activities, 75);
  }, [usersList, activities]);

  const filteredAuditStudents = useMemo(() => {
    const term = auditSearch.toLowerCase();
    return auditData.students.filter((st) => {
      const matchText = st.name.toLowerCase().includes(term) || st.email.toLowerCase().includes(term) || st.course.toLowerCase().includes(term);
      if (!matchText) return false;
      if (auditFilter === 'ELIGIBLE') return st.isEligible;
      if (auditFilter === 'INELIGIBLE') return !st.isEligible;
      return true;
    });
  }, [auditData, auditSearch, auditFilter]);

  const handleExportUfuCsv = () => {
    const csvContent = exportUfuAuditCsv(auditData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria-ufu-75pct-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHead
          title={activeTab === 'papéis' ? 'Participantes e papéis' : 'Auditoria de Extensão UFU (Regra 75%)'}
          subtitle={
            activeTab === 'papéis'
              ? `${usersList.length} inscritos · ${noTicket} sem ingresso Sympla`
              : `${auditData.totalUfuStudents} alunos com vínculo UFU · ${auditData.eligibleCount} aptos para certificado PROEX`
          }
        />

        {/* Alternador de Módulo Principal */}
        <div className="flex items-center gap-1.5 self-start rounded-2xl border border-line bg-surface p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('papéis')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all ${
              activeTab === 'papéis'
                ? 'bg-link font-extrabold text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <Users size={16} />
            <span>Papéis & Acessos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('auditoria_ufu')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all ${
              activeTab === 'auditoria_ufu'
                ? 'bg-link font-extrabold text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <GraduationCap size={16} />
            <span>Auditoria UFU (75%)</span>
            {auditData.eligibleCount > 0 && (
              <span className="rounded-full bg-ok/25 px-1.5 py-0.2 text-[10px] font-black text-ok">
                {auditData.eligibleCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ABA 1: PARTICIPANTES E PAPÉIS (TRADICIONAL) */}
      {activeTab === 'papéis' && (
        <div className="mt-2 space-y-4">
          <label className="flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 lg:hidden">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Buscar pessoa</span>
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nome, @ ou e-mail"
              className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-text outline-none placeholder:text-text-3"
            />
          </label>

          <div className="adm-noscroll -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por papel">
            {FILTERS.map((f) => (
              <Chip key={f.key} selected={userRoleFilter === f.key} onClick={() => setUserRoleFilter(f.key)}>
                <span className={f.short ? 'lg:hidden' : 'hidden'}>{f.short}</span>
                <span className={f.short ? 'hidden lg:inline' : ''}>{f.label}</span>
                <span className={userRoleFilter === f.key ? 'opacity-60' : 'text-text-3'}>{count(f.key)}</span>
              </Chip>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState>Ninguém encontrado com esse filtro.</EmptyState>
          ) : (
            <>
              {/* Tabela (desktop) */}
              <div className="hidden overflow-x-auto rounded-[20px] bg-surface px-2 pb-1 pt-4 lg:block">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="text-[12px] text-text-3">
                      {['Pessoa', 'E-mail', 'Curso / vínculo', 'Ingresso', 'Pontos', 'Papel'].map((h) => <th key={h} className="px-3 pb-3 font-bold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((u) => (
                      <tr key={u.uid || u.id} className="border-t border-line">
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar user={u} />
                            <span className="min-w-0">
                              <span className="block text-[14px] font-bold">{nameOf(u)}</span>
                              <span className="block text-[12px] text-text-3">{handleOf(u)}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[14px] text-text">{u.email}</td>
                        <td className="px-3 py-3 text-[13px] text-text-2">{courseOf(u)}</td>
                        <td className="px-3 py-3 text-[13px] font-bold">
                          {u.hasSymplaTicket
                            ? <span className="inline-flex items-center gap-1.5 text-ok"><Check size={15} aria-hidden="true" /> Vinculado</span>
                            : <span className="text-warn">Pendente</span>}
                        </td>
                        <td className="px-3 py-3 text-[14px] font-extrabold">{Number(u.totalPoints ?? u.pontuacaoTotal ?? 0).toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-3"><RoleSelect user={u} onChange={onChangeRole} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lista (celular) */}
              <ul className="m-0 list-none p-0 lg:hidden">
                {list.map((u) => (
                  <li key={u.uid || u.id} className="flex items-center gap-3 border-b border-line py-3">
                    <Avatar user={u} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{nameOf(u)}</span>
                      <span className={`block truncate text-[13px] ${u.hasSymplaTicket ? 'text-ok' : 'text-warn'}`}>
                        {handleOf(u)} · {u.hasSymplaTicket ? 'ingresso ok' : 'sem ingresso'}
                      </span>
                    </span>
                    <RoleSelect user={u} onChange={onChangeRole} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ABA 2: AUDITORIA UFU (REGRA 75% DE FREQUÊNCIA EXTENSIONISTA) */}
      {activeTab === 'auditoria_ufu' && (
        <div className="mt-2 space-y-5">
          {/* Card de Contexto e Regra PROEX */}
          <div className="rounded-2xl border border-line bg-surface-raised p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-link/15 text-link">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="m-0 text-[16px] font-black text-text">
                    Regra Institucional PROEX / FACOM UFU (75% de Carga Horária)
                  </h3>
                  <p className="m-0 mt-0.5 text-[13px] text-text-2">
                    A TechWeek possui <b>{auditData.totalEventHours} horas</b> de atividades programadas. Alunos UFU precisam de no mínimo <b>{auditData.requiredHours} horas</b> presenciais validadas para emissão oficial do certificado de extensão universitária.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportUfuCsv}
                className={btn('action', 'shrink-0 text-[13px]')}
              >
                <Download size={15} /> Exportar CSV PROEX
              </button>
            </div>
          </div>

          {/* Grid de KPIs de Auditoria */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="Alunos UFU na Base"
              value={auditData.totalUfuStudents}
              hint="Cursos FACOM e comunidade"
              accent="var(--link)"
            />
            <Kpi
              label="Aptos ao Certificado"
              value={auditData.eligibleCount}
              hint="Cumpriram ≥ 75% da carga"
              accent="var(--ok)"
            />
            <Kpi
              label="Horas Insuficientes"
              value={auditData.ineligibleCount}
              hint="Abaixo da régua de 75%"
              accent="var(--warn)"
            />
            <Kpi
              label="Média de Frequência"
              value={`${auditData.avgAttendanceRate}%`}
              hint="Das horas exigidas cumpridas"
              accent="#C4B5FD"
            />
          </div>

          {/* Filtros e Busca de Alunos */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuditFilter('ALL')}
                className={`h-9 rounded-full px-3.5 text-[12px] font-bold transition-all ${
                  auditFilter === 'ALL'
                    ? 'bg-link font-extrabold text-[#0A0F24]'
                    : 'bg-surface text-text-3 hover:text-text'
                }`}
              >
                Todos ({auditData.totalUfuStudents})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('ELIGIBLE')}
                className={`flex items-center gap-1.5 h-9 rounded-full px-3.5 text-[12px] font-bold transition-all ${
                  auditFilter === 'ELIGIBLE'
                    ? 'bg-ok font-extrabold text-[#0A0F24]'
                    : 'bg-surface text-text-3 hover:text-ok'
                }`}
              >
                <CheckCircle2 size={14} /> Aptos ({auditData.eligibleCount})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('INELIGIBLE')}
                className={`flex items-center gap-1.5 h-9 rounded-full px-3.5 text-[12px] font-bold transition-all ${
                  auditFilter === 'INELIGIBLE'
                    ? 'bg-warn font-extrabold text-[#0A0F24]'
                    : 'bg-surface text-text-3 hover:text-warn'
                }`}
              >
                <AlertTriangle size={14} /> Incompletos ({auditData.ineligibleCount})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="search"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filtrar por nome ou curso..."
                className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-[13px] text-text outline-none focus:border-link"
              />
            </div>
          </div>

          {/* Lista / Tabela de Alunos Auditados */}
          {filteredAuditStudents.length === 0 ? (
            <EmptyState>Nenhum aluno encontrado com os filtros selecionados.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[12px] font-bold text-text-3">
                    <th className="px-4 py-3">Estudante UFU</th>
                    <th className="px-4 py-3">Curso & Período</th>
                    <th className="px-4 py-3">Atividades</th>
                    <th className="px-4 py-3">Horas / Exigidas</th>
                    <th className="px-4 py-3">Frequência (%)</th>
                    <th className="px-4 py-3 text-right">Parecer PROEX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredAuditStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="block text-[14px] font-bold text-text">{st.name}</span>
                        <span className="block text-[12px] text-text-3">{st.email}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-text-2">
                        {st.course}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-text">
                        {st.attendedActivitiesCount} sessões
                      </td>
                      <td className="px-4 py-3.5 text-[13px]">
                        <span className="font-bold text-text">{st.attendedHours}h</span>
                        <span className="text-text-3"> / {st.requiredHours}h</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className={st.isEligible ? 'text-ok' : 'text-warn'}>
                              {st.attendancePercentage}%
                            </span>
                            <span className="text-text-3">Meta: 75%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(st.attendancePercentage, 100)}%`,
                                background: st.isEligible ? 'var(--ok)' : 'var(--warn)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {st.isEligible ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-ok">
                            <CheckCircle2 size={13} /> Apto Certificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-warn">
                            <AlertTriangle size={13} /> Carga Incompleta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
