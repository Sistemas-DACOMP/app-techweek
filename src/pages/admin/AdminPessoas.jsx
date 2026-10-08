import { ChevronDown, Check, Search } from 'lucide-react';
import { ROLE_COLORS, ROLE_LABELS } from '../../components/RoleSwitcher';
import { PageHead, Chip, EmptyState } from './ui';

/* 2.04 Participantes e papéis (desktop) e 2.12 Pessoas (celular). Cor de papel: DESIGN.md §2.8.
   A troca de papel usa a mesma chamada de antes (updateUserRoleInFirestore); a interface não é autorização. */

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
    <span className="press relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[13px] font-extrabold focus-within:outline focus-within:outline-2 focus-within:outline-link lg:h-11 lg:pl-3.5 lg:text-[14px]" style={{ color, background: `color-mix(in srgb, ${color} 16%, var(--surface))` }}>
      {ROLE_LABELS[role]}
      <ChevronDown size={15} aria-hidden="true" />
      {/* select nativo invisível por cima: teclado e leitor de tela continuam funcionando */}
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

export default function AdminPessoas({ usersList, userSearch, setUserSearch, userRoleFilter, setUserRoleFilter, onChangeRole }) {
  const q = userSearch.toLowerCase();
  const list = usersList.filter((u) => {
    const match = nameOf(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    return match && (userRoleFilter === 'ALL' || roleOf(u) === userRoleFilter);
  });
  const count = (k) => (k === 'ALL' ? usersList.length : usersList.filter((u) => roleOf(u) === k).length);
  const noTicket = usersList.filter((u) => roleOf(u) === 'PARTICIPANT' && !u.hasSymplaTicket).length;

  return (
    <>
      <PageHead title="Participantes e papéis" subtitle={`${usersList.length} inscritos · ${noTicket} sem ingresso Sympla`} />

      <label className="mb-3 flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 lg:hidden">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Buscar pessoa</span>
        <input type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Nome, @ ou e-mail" className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-text outline-none placeholder:text-text-3" />
      </label>

      <div className="adm-noscroll -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por papel">
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
    </>
  );
}
