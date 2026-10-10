// A barra inferior é do app do participante. Quem entra com outro papel (admin, staff,
// patrocinador) ou acessa o portal do patrocinador (/sponsor) não deve ver essa barra.
export function shouldShowBottomNav({ pathname, search = '', role, isAuthPage = false, isPortalPage = false }) {
  if (isAuthPage || isPortalPage || pathname === '/sponsor') return false;
  const editingProfile = pathname === '/profile' && new URLSearchParams(search).get('edit') === 'true';
  const isParticipant = !role || role === 'PARTICIPANT';
  return !(editingProfile && !isParticipant);
}
