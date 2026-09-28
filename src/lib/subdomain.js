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
