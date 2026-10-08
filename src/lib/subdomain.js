/**
 * Utilitário para detecção de subdomínios (admin.*, staff.*)
 * Permite separar as aplicações sem qualquer vazamento ou link cruzado no app normal.
 */
export function getAppSubdomain() {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();

  // Subdomínios de Administração
  if (hostname.startsWith('admin.') || hostname.startsWith('adm.')) {
    return 'admin';
  }

  // Subdomínios de Staff / Portaria
  if (hostname.startsWith('staff.') || hostname.startsWith('portaria.')) {
    return 'staff';
  }

  return null;
}

/**
 * Rotas que cada subdomínio pode abrir. Além do painel, /profile precisa passar:
 * "Editar perfil" do Admin/Staff leva pra lá, e sem isso o App devolvia a pessoa pro painel
 * (ou, sem sessão Firebase real, pro /login) em vez de abrir a edição (KAN-118).
 */
const SUBDOMAIN_ROUTES = {
  admin: ['/admin', '/profile'],
  staff: ['/staff', '/profile'],
};

export function isRouteAllowedOnSubdomain(sub, pathname) {
  return SUBDOMAIN_ROUTES[sub]?.includes(pathname) ?? true;
}
