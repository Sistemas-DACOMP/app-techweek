import { useNavigate } from 'react-router-dom';
import { User, ScanLine, Briefcase, ShieldCheck, ChevronRight } from 'lucide-react';

/**
 * "Trocar de conta" (DESIGN.md §2.8 e §6 Perfil/Conta): lista os papéis que a conta tem, uma cor por papel.
 * Só navega. Interface não é autorização — cada área continua checando o papel efetivo no servidor/página.
 */
const ROLES = [
  { key: 'PARTICIPANT', label: 'Participante', desc: 'Agenda, crachá e pontos', path: '/', color: '#A78BFA', icon: User },
  { key: 'STAFF', label: 'Staff', desc: 'Ler crachás nas salas e na entrada', path: '/staff', color: '#67D4E8', icon: ScanLine },
  { key: 'SPONSOR', label: 'Patrocinador', desc: 'Leads do estande', path: '/sponsor', color: '#FBBF24', icon: Briefcase },
  { key: 'ADMIN', label: 'Admin', desc: 'Programação, pessoas e avisos', path: '/admin', color: '#F59AC0', icon: ShieldCheck },
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
    <ul className="m-0 list-none overflow-hidden rounded-2xl bg-surface p-0">
      {available.map(({ key, label, desc, path, color, icon: Icon }, i) => {
        const inUse = key === current;
        return (
          <li key={key} className={i < available.length - 1 ? 'border-b border-line' : undefined}>
            <button
              type="button"
              onClick={() => !inUse && navigate(path)}
              aria-current={inUse ? 'true' : undefined}
              className="flex min-h-[60px] w-full items-center gap-3 border-0 border-l-[3px] border-solid px-3 text-left"
              style={{ borderLeftColor: color, background: inUse ? `${color}12` : 'transparent', cursor: inUse ? 'default' : 'pointer' }}
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: `${color}24` }}>
                <Icon size={18} color={color} strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold" style={{ color }}>{label}</span>
                <span className="mt-px block text-[13px] text-text-2">{desc}</span>
              </span>
              {inUse ? (
                <span className="rounded-[9px] px-[9px] py-[3px] text-[12px] font-extrabold" style={{ color, background: `${color}26` }}>
                  em uso
                </span>
              ) : (
                <ChevronRight size={18} color="#6E779A" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
