import { isAdminEmail } from './userService';

// Decide o que a tela protegida (Admin/Staff) mostra. Só decide "login" depois que o
// Firebase terminou de restaurar a sessão e o perfil chegou, senão o reload pisca o login.
// A UI não é autorização: o backend barra as rotas por papel de qualquer forma.
export function decideAccess({ authLoading, user, profileReady, role, allowed }) {
  if (authLoading) return 'loading';
  if (!user) return 'login';
  const isUserAdmin = Boolean(user.email && isAdminEmail(user.email));
  if (!profileReady && !isUserAdmin) return 'loading';
  const effectiveRole = isUserAdmin ? 'ADMIN' : role;
  return allowed.includes(effectiveRole) ? 'allowed' : 'login';
}
