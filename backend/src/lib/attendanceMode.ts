export type AttendanceMode = 'SELF_SCAN' | 'DOUBLE_CHECK';

// Campo opcional em /activities/{id} (D2 do SPEC KAN-51) — ausente ou
// qualquer valor que não seja 'DOUBLE_CHECK' vira 'SELF_SCAN', pra não
// quebrar atividades já cadastradas antes deste campo existir.
export function resolveAttendanceMode(activityData: Record<string, unknown>): AttendanceMode {
  return activityData.attendanceMode === 'DOUBLE_CHECK' ? 'DOUBLE_CHECK' : 'SELF_SCAN';
}
