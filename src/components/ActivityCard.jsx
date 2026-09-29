import React from 'react';
import EventCard from './EventCard';

/**
 * ActivityCard - Wrapper para manter retrocompatibilidade com Dashboard e páginas existentes,
 * delegando renderização e comportamento diretamente para o EventCard (Utility-First Dark Theme).
 */
export default function ActivityCard(props) {
  return <EventCard {...props} />;
}

export { EventCard };
