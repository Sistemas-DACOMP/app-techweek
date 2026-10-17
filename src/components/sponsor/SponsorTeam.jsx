import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  Briefcase,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  getSponsorTeam,
  createSponsorTeamInvites,
  removeSponsorTeamMember,
  revokeSponsorTeamInvite,
  resendSponsorTeamInvite,
  inviteErrorMessage,
  splitEmails,
} from '../../lib/sponsorInviteService';
import { btn } from '../../pages/admin/ui';
import { Avatar, CotaText, TierStripe } from '../../pages/sponsor/ui';
import { TIER_BAR, relTime } from '../../pages/sponsor/util';

/**
 * Gestão Completa da Equipe do Estande (KAN-124).
 * Permite visualizar cotas de crachás, convidar novos membros via link rápido ou e-mail,
 * acompanhar convites pendentes e remover membros com segurança e liberação automática de vaga.
 */
export default function SponsorTeam({
  companyId,
  companyName = 'Patrocinador',
  userProfile = {},
  authUser = {},
  onTeamUpdated,
}) {
  const [teamData, setTeamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulário de convite
  const [emailInput, setEmailInput] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(null);

  // Link rápido gerado/copiado
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal de confirmação de exclusão
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  // Ações de convites pendentes
  const [actionInviteId, setActionInviteId] = useState(null);

  // Toast temporário
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSponsorTeam(companyId);
      setTeamData(data);
      if (onTeamUpdated) onTeamUpdated(data);
    } catch (err) {
      console.error('Erro ao carregar equipe do patrocinador:', err);
      setError(inviteErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [companyId, onTeamUpdated]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Convite nominal via formulário de e-mails
  const handleSendEmailInvites = async (e) => {
    e.preventDefault();
    const emails = splitEmails(emailInput);
    if (emails.length === 0) {
      setInviteFeedback({
        type: 'error',
        message: 'Informe pelo menos um endereço de e-mail válido.',
      });
      return;
    }

    if (teamData && emails.length > teamData.availableSlots) {
      setInviteFeedback({
        type: 'error',
        message: `Você informou ${emails.length} e-mail(s), mas restam apenas ${teamData.availableSlots} vaga(s) na cota.`,
      });
      return;
    }

    setIsSubmittingInvite(true);
    setInviteFeedback(null);
    try {
      const res = await createSponsorTeamInvites({ emails, sponsorId: companyId });
      setEmailInput('');
      showToast(
        emails.length === 1
          ? 'Convite enviado com sucesso!'
          : `${emails.length} convites enviados com sucesso!`,
        'success'
      );
      await fetchTeam();
    } catch (err) {
      console.error('Erro ao enviar convites:', err);
      setInviteFeedback({
        type: 'error',
        message: inviteErrorMessage(err),
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Gerar e copiar link de convite rápido
  const handleCopyQuickLink = async () => {
    setIsGeneratingLink(true);
    try {
      const res = await createSponsorTeamInvites({ sponsorId: companyId });
      const inviteUrl = res?.invites?.[0]?.inviteUrl;
      if (inviteUrl) {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
        }
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        showToast('Link de convite copiado para a área de transferência!', 'success');
        await fetchTeam();
      } else {
        throw new Error('Link não retornado pelo servidor.');
      }
    } catch (err) {
      console.error('Erro ao gerar link de convite:', err);
      showToast(inviteErrorMessage(err), 'error');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Confirmar exclusão de membro
  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    setRemoveError(null);
    try {
      await removeSponsorTeamMember(memberToRemove.uid, companyId);
      const removedName = memberToRemove.displayName || memberToRemove.email;
      setMemberToRemove(null);
      showToast(`${removedName} foi removido da equipe. A vaga foi liberada na cota.`, 'success');
      await fetchTeam();
    } catch (err) {
      console.error('Erro ao remover membro:', err);
      setRemoveError(inviteErrorMessage(err));
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Revogar convite pendente
  const handleRevokeInvite = async (inviteId) => {
    setActionInviteId(inviteId);
    try {
      await revokeSponsorTeamInvite(inviteId, companyId);
      showToast('Convite revogado.', 'info');
      await fetchTeam();
    } catch (err) {
      console.error('Erro ao revogar convite:', err);
      showToast(inviteErrorMessage(err), 'error');
    } finally {
      setActionInviteId(null);
    }
  };

  // Reenviar convite pendente
  const handleResendInvite = async (inviteId) => {
    setActionInviteId(inviteId);
    try {
      const res = await resendSponsorTeamInvite(inviteId, companyId);
      const url = res?.inviteUrl;
      if (url && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast('Convite reenviado e novo link copiado!', 'success');
      } else {
        showToast('Convite reenviado com sucesso!', 'success');
      }
      await fetchTeam();
    } catch (err) {
      console.error('Erro ao reenviar convite:', err);
      showToast(inviteErrorMessage(err), 'error');
    } finally {
      setActionInviteId(null);
    }
  };

  // Loading inicial
  if (isLoading && !teamData) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[20px] border border-line bg-surface p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-link" />
          <span className="text-[14px] font-bold text-text-3">Carregando equipe do estande...</span>
        </div>
      </div>
    );
  }

  // Erro ao carregar
  if (error && !teamData) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[20px] border border-line bg-surface p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-err/10 text-err">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="m-0 text-[16px] font-extrabold text-text">Não foi possível carregar a equipe</h2>
          <p className="m-0 mt-1 max-w-md text-[13px] text-text-3">{error}</p>
        </div>
        <button type="button" onClick={fetchTeam} className={btn('secondary')}>
          <RotateCcw size={16} />
          <span>Tentar novamente</span>
        </button>
      </div>
    );
  }

  const {
    tier = 'PRATA',
    teamLimit = 3,
    memberCount = 0,
    availableSlots = 0,
    allowedEmailDomain = null,
    members = [],
    pendingInvites = [],
  } = teamData || {};

  const currentUid = authUser?.uid || userProfile?.uid;
  const usagePct = teamLimit > 0 ? Math.min(100, Math.round((memberCount / teamLimit) * 100)) : 0;
  const isTeamFull = availableSlots <= 0;

  return (
    <div className="sponsor-team flex flex-col gap-5 pb-10">
      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl bg-surface-selected border border-line px-4 py-3 text-[13px] font-bold text-text shadow-2xl animate-fade-in"
          style={{
            borderColor:
              toast.type === 'error'
                ? 'var(--err)'
                : toast.type === 'info'
                ? 'var(--link)'
                : 'var(--ok)',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-err shrink-0" />
          ) : (
            <Check size={16} className="text-ok shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* CARD 1: COTA E STATUS DA EQUIPE */}
      <section
        aria-labelledby="team-quota-title"
        className="overflow-hidden rounded-[20px] border border-line bg-surface p-5 shadow-sm"
      >
        <TierStripe tier={tier} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-link" />
                <h2 id="team-quota-title" className="m-0 text-[16px] font-extrabold text-text">
                  Cota de Equipe do Estande
                </h2>
              </div>
              <p className="m-0 mt-0.5 text-[12px] text-text-3">
                Membros com crachá e acesso autorizado ao painel de recrutamento da {companyName}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-[12px] font-extrabold text-text-2">
                <CotaText tier={tier} />
              </span>
              {allowedEmailDomain && (
                <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-[12px] font-bold text-link" title={`Apenas e-mails @${allowedEmailDomain}`}>
                  @{allowedEmailDomain}
                </span>
              )}
            </div>
          </div>

          {/* Barra de progresso da cota */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-bold text-text">
                <span className="text-[18px] font-black text-link">{memberCount}</span> de{' '}
                <span className="font-extrabold">{teamLimit}</span> vagas ocupadas
              </span>
              <span className="font-extrabold text-text-3">
                {availableSlots > 0 ? (
                  <span className="text-ok font-bold">{availableSlots} {availableSlots === 1 ? 'vaga livre' : 'vagas livres'}</span>
                ) : (
                  <span className="text-warn font-bold">Cota completa</span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePct}%`,
                  background: isTeamFull
                    ? 'var(--warn)'
                    : tier && TIER_BAR[tier]
                    ? TIER_BAR[tier]
                    : 'var(--link)',
                }}
              />
            </div>
          </div>

          {isTeamFull && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn/10 p-3 text-[12px] text-text-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
              <span>
                Sua equipe atingiu o limite de vagas disponíveis ({teamLimit}). Para adicionar novos recrutadores, remova membros inativos ou solicite a ampliação da cota junto à coordenação do evento.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* CARD 2: ADICIONAR NOVO MEMBRO (1-CLIQUE OU E-MAIL) */}
      {!isTeamFull && (
        <section
          aria-labelledby="add-member-title"
          className="rounded-[20px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={18} className="text-ok" />
            <h2 id="add-member-title" className="m-0 text-[16px] font-extrabold text-text">
              Adicionar Novo Membro da Equipe
            </h2>
          </div>
          <p className="m-0 mb-4 text-[12px] text-text-3">
            Envie convites nominais por e-mail ou copie o link rápido para compartilhar diretamente com seus colegas.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Opção 1: Link Rápido de Convite */}
            <div className="lg:col-span-5 flex flex-col gap-2.5 rounded-xl border border-line bg-surface-raised p-4">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-link" />
                <span className="text-[13px] font-extrabold text-text">Link Rápido de Convite</span>
              </div>
              <p className="m-0 text-[12px] text-text-3 leading-relaxed">
                {allowedEmailDomain ? (
                  <>Gera um link com validação automática para qualquer pessoa com e-mail <strong>@{allowedEmailDomain}</strong>.</>
                ) : (
                  <>Gera um link seguro para entrada imediata na equipe da empresa.</>
                )}
              </p>
              <button
                type="button"
                onClick={handleCopyQuickLink}
                disabled={isGeneratingLink}
                className={btn('secondary', 'w-full justify-center')}
              >
                {isGeneratingLink ? (
                  <Loader2 size={16} className="animate-spin text-link" />
                ) : copiedLink ? (
                  <Check size={16} className="text-ok" />
                ) : (
                  <Copy size={16} />
                )}
                <span>{copiedLink ? 'Link copiado!' : 'Copiar link de convite'}</span>
              </button>
            </div>

            {/* Opção 2: Convite Nominal por E-mail */}
            <form onSubmit={handleSendEmailInvites} className="lg:col-span-7 flex flex-col gap-2.5">
              <label htmlFor="team-invite-emails" className="text-[13px] font-extrabold text-text flex items-center gap-2">
                <Mail size={16} className="text-link" />
                <span>Convidar por E-mail</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="team-invite-emails"
                  type="text"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (inviteFeedback) setInviteFeedback(null);
                  }}
                  placeholder={
                    allowedEmailDomain
                      ? `colega@${allowedEmailDomain}, outro@${allowedEmailDomain}`
                      : 'recrutador@empresa.com, dev@empresa.com'
                  }
                  className="flex-1 rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-[13px] text-text placeholder:text-text-4 focus:border-link focus:outline-none min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingInvite || !emailInput.trim()}
                  className={btn('action', 'sm:w-auto justify-center')}
                >
                  {isSubmittingInvite ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  <span>Enviar convite</span>
                </button>
              </div>
              {inviteFeedback && (
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-err">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{inviteFeedback.message}</span>
                </div>
              )}
              <span className="text-[11px] text-text-4">
                Separe múltiplos endereços por vírgula ou espaço. Cada convite enviado reserva 1 vaga na cota.
              </span>
            </form>
          </div>
        </section>
      )}

      {/* CARD 3: LISTA DE MEMBROS ATUAIS */}
      <section
        aria-labelledby="team-members-list-title"
        className="rounded-[20px] border border-line bg-surface p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-link" />
            <h2 id="team-members-list-title" className="m-0 text-[16px] font-extrabold text-text">
              Membros Atuais ({members.length})
            </h2>
          </div>
          <span className="text-[12px] text-text-3 font-semibold">
            {members.length} de {teamLimit} vagas ocupadas
          </span>
        </div>

        {members.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-text-3">
            Nenhum membro cadastrado na equipe ainda.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {members.map((member) => {
              const isSelf = member.isCurrentUser || member.uid === currentUid;
              return (
                <div
                  key={member.uid}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                >
                  {/* Dados do Membro */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={member.displayName || member.email || 'Membro'}
                      photo={member.photoURL}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-extrabold text-text">
                          {member.displayName || 'Membro da equipe'}
                        </span>
                        {isSelf && (
                          <span className="rounded-md bg-link/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-link">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-text-3">
                        <span className="truncate">{member.email || 'Sem e-mail'}</span>
                        {member.jobTitle && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1 text-text-2">
                              <Briefcase size={12} className="text-text-4" />
                              <span className="truncate">{member.jobTitle}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações / Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {member.joinedAt && (
                      <span className="text-[11px] text-text-4 flex items-center gap-1">
                        <Clock size={12} />
                        <span>Entrou {relTime(member.joinedAt)}</span>
                      </span>
                    )}

                    {!isSelf ? (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        title={`Remover ${member.displayName || 'membro'} da equipe`}
                        aria-label={`Remover ${member.displayName || 'membro'} da equipe`}
                        className="press flex size-11 items-center justify-center rounded-xl bg-surface-raised text-text-3 hover:bg-err/15 hover:text-err transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span className="text-[12px] font-bold text-text-4 px-2.5 py-1">
                        Acesso ativo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CARD 4: CONVITES PENDENTES */}
      {pendingInvites.length > 0 && (
        <section
          aria-labelledby="pending-invites-title"
          className="rounded-[20px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-warn" />
              <h2 id="pending-invites-title" className="m-0 text-[16px] font-extrabold text-text">
                Convites Pendentes ({pendingInvites.length})
              </h2>
            </div>
            <span className="text-[12px] text-text-3 font-semibold">
              Aguardando confirmação
            </span>
          </div>

          <div className="flex flex-col divide-y divide-line">
            {pendingInvites.map((inv) => {
              const isActing = actionInviteId === inv.inviteId;
              return (
                <div
                  key={inv.inviteId}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0">
                    <span className="block text-[13px] font-bold text-text truncate">
                      {inv.email || 'Link rápido aberto'}
                    </span>
                    <span className="block text-[11px] text-text-4">
                      {inv.expiresAt
                        ? `Expira ${relTime(inv.expiresAt)}`
                        : 'Convite ativo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleResendInvite(inv.inviteId)}
                      disabled={isActing}
                      title="Reenviar convite"
                      aria-label="Reenviar convite"
                      className="press flex size-11 items-center justify-center rounded-xl bg-surface-raised text-text-2 hover:text-text"
                    >
                      {isActing ? (
                        <Loader2 size={16} className="animate-spin text-link" />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv.inviteId)}
                      disabled={isActing}
                      title="Revogar convite"
                      aria-label="Revogar convite"
                      className="press flex size-11 items-center justify-center rounded-xl bg-surface-raised text-text-3 hover:bg-err/15 hover:text-err"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE REMOÇÃO DE MEMBRO */}
      {memberToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-remove-title"
          onClick={() => {
            if (!isRemovingMember) setMemberToRemove(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-err/15 text-err">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-remove-title" className="m-0 text-[16px] font-extrabold text-text">
                  Remover membro da equipe?
                </h3>
                <p className="m-0 mt-1.5 text-[13px] text-text-2 leading-relaxed">
                  Tem certeza que deseja remover{' '}
                  <strong>{memberToRemove.displayName || memberToRemove.email}</strong> da equipe?
                </p>
                <p className="m-0 mt-1 text-[12px] text-text-3 leading-relaxed">
                  O acesso ao estande e ao CRM de leads será revogado imediatamente e a vaga voltará a ficar livre na cota da empresa.
                </p>
              </div>
            </div>

            {removeError && (
              <div className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-err/30 bg-err/10 p-2.5 text-[12px] font-bold text-err">
                <AlertCircle size={14} className="shrink-0" />
                <span>{removeError}</span>
              </div>
            )}

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
                className={btn('secondary')}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemovingMember}
                className={btn('danger', 'text-err font-extrabold')}
              >
                {isRemovingMember ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>Sim, remover membro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
