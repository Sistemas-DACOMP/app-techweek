import { ChevronRight, Pencil, LogOut } from 'lucide-react';
import RoleSwitcher from '../../components/RoleSwitcher';
import { AdminAvatar } from './AdminShell';

/* ContaAdmin (celular): perfil, trocar de conta e sair. Só navega; a autorização continua nas rotas e no servidor. */
export default function AdminConta({ me, handle, role, onProfile, onLogout }) {
  return (
    <div className="mx-auto max-w-[520px]">
      <div className="flex items-center gap-3.5 pt-1">
        <AdminAvatar {...me} size={60} ring={3} />
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-extrabold">{me.name}</div>
          {handle && <div className="mt-px text-[13px] text-text-2">{handle} · organização</div>}
          <span className="mt-1.5 inline-block rounded-[9px] px-2.5 py-0.5 text-[12px] font-extrabold" style={{ background: 'rgba(245,154,192,0.15)', color: 'var(--role-admin)' }}>Você está como Admin</span>
        </div>
      </div>

      <button type="button" onClick={onProfile} className="press mt-3.5 flex min-h-[60px] w-full items-center gap-3 rounded-2xl bg-surface px-3.5 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-text-2"><Pencil size={17} aria-hidden="true" /></span>
        <span className="flex-1">
          <span className="block text-[15px] font-bold">Editar perfil</span>
          <span className="mt-px block text-[13px] text-text-3">Foto, nome e redes</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="text-text-4" />
      </button>

      <section aria-labelledby="papel-t" className="mt-[22px]">
        <h2 id="papel-t" className="m-0 mb-2 text-[16px] font-extrabold">Trocar de conta</h2>
        <RoleSwitcher role={role} current="ADMIN" />
        <p className="m-0 mt-2 px-0.5 text-[12px] text-text-4">Só aparecem os papéis que a sua conta tem.</p>
      </section>

      <button type="button" onClick={onLogout} className="press mt-6 flex min-h-12 w-full items-center justify-center gap-2 text-[15px] font-bold text-err">
        <LogOut size={18} aria-hidden="true" /> Sair da conta
      </button>
    </div>
  );
}
