/**
 * Definição dos níveis de gamificação da TechWeek.
 * Cada nível possui uma faixa de pontuação e um título de conquista.
 */
export const LEVEL_TIERS = [
  { level: 1, title: 'Novato', minPoints: 0, maxPoints: 29 },
  { level: 2, title: 'Explorador', minPoints: 30, maxPoints: 69 },
  { level: 3, title: 'Conectado', minPoints: 70, maxPoints: 119 },
  { level: 4, title: 'Avançado', minPoints: 120, maxPoints: 199 },
  { level: 5, title: 'Expert', minPoints: 200, maxPoints: Infinity }
];

/**
 * Calcula o nível do participante, o rótulo descritivo e o progresso para o próximo nível.
 *
 * @param {number|string} points - Pontuação acumulada do usuário
 * @returns {{
 *   level: number,
 *   title: string,
 *   label: string,
 *   points: number,
 *   minPoints: number,
 *   nextLevelPoints: number|null,
 *   pointsToNext: number,
 *   progress: number,
 *   isMaxLevel: boolean
 * }}
 */
export function calculateLevel(points = 0) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));

  const currentTier = [...LEVEL_TIERS]
    .reverse()
    .find(tier => safePoints >= tier.minPoints) || LEVEL_TIERS[0];

  const isMaxLevel = currentTier.level === LEVEL_TIERS[LEVEL_TIERS.length - 1].level;
  const nextTier = isMaxLevel ? null : LEVEL_TIERS.find(t => t.level === currentTier.level + 1);

  let progress = 100;
  let pointsToNext = 0;

  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints;
    const gained = safePoints - currentTier.minPoints;
    progress = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
    pointsToNext = nextTier.minPoints - safePoints;
  }

  return {
    level: currentTier.level,
    title: currentTier.title,
    label: `Nível ${currentTier.level} - ${currentTier.title}`,
    points: safePoints,
    minPoints: currentTier.minPoints,
    nextLevelPoints: nextTier ? nextTier.minPoints : null,
    pointsToNext,
    progress,
    isMaxLevel
  };
}

