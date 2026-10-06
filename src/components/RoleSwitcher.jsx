import { useNavigate } from 'react-router-dom';
import { User, ScanLine, Gem, ShieldCheck, ChevronRight } from 'lucide-react';

/**
 * "Trocar de conta" (DESIGN.md §2.8 e §6 Perfil/Conta): lista os papéis que a conta tem, uma cor por papel.
 * Só navega. Interface não é autorização — cada área continua checando o papel efetivo no servidor/página.
 */
const ROLES = [
  { key: 'PARTICIPANT', label: 'Participante', desc: 'App do evento', path: '/', color: 'var(--role-participante)', icon: User },
  { key: 'STAFF', label: 'Staff', desc: 'Portaria e leitor de presença', path: '/staff', color: 'var(--role-staff)', icon: ScanLine },
  { key: 'SPONSOR', label: 'Patrocinador', desc: 'Leitor de leads do estande', path: '/sponsor', color: 'var(--role-patrocinador)', icon: Gem },
  { key: 'ADMIN', label: 'Admin', desc: 'Painel da organização', path: '/admin', color: 'var(--role-admin)', icon: ShieldCheck },
];

export function rolesFor(role) {
  if (role === 'ADMIN') return ROLES.map((r) => r.key);
  if (role === 'STAFF' || role === 'SPONSOR') return ['PARTICIPANT', role];
  return ['PARTICIPANT'];
}

export const ROLE_COLORS = Object.fromEntries(ROLES.map((r) => [r.key, r.color]));
export const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));

export default function RoleSwitcher({ role, current }) {
  const navigate = useNavigate();
  const available = ROLES.filter((r) => rolesFor(role).includes(r.key));

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {available.map(({ key, label, desc, path, color, icon: Icon }) => {
        const inUse = key === current;
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => !inUse && navigate(path)}
              aria-current={inUse ? 'true' : undefined}
              className="press relative flex min-h-[60px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-line bg-surface py-2.5 pl-5 pr-3 text-left"
              style={inUse ? { background: 'var(--surface-raised)', borderColor: `color-mix(in srgb, ${color} 45%, transparent)` } : undefined}
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
              >
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-text">{label}</span>
                <span className="block text-[13px] text-text-3">{desc}</span>
              </span>
              {inUse ? (
                <span className="rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                  em uso
                </span>
              ) : (
                <ChevronRight size={18} className="text-text-4" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
