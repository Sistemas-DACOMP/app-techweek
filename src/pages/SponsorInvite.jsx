import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Clock, Lock, ImagePlus, Loader2, ScanLine, Users, LifeBuoy, AlertTriangle } from 'lucide-react';
import AvatarCropperModal from '../components/AvatarCropperModal';
import iconeTw from '../assets/icone.png';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { signUpWithEmail, loginWithEmailAndPassword, deleteCurrentUserAccount } from '../lib/auth';
import { uploadUserAvatar } from '../lib/userService';
import { formatPhone, getPasswordStrength, isValidEmail, isValidName, isValidPhone, normalizeEmail, validateAvatarFile } from '../lib/validators';
import {
  acceptInvite, getInvite, inviteErrorCode, inviteErrorMessage, isRetryableAccept,
} from '../lib/sponsorInviteService';
import { Field, initials } from './admin/ui';
import { LogoPlate, TierText, tierRule, TIERS, formatDay } from './admin/patrocinadores/shared';

/* KAN-124: cadastro de patrocinador por convite. Rota pública /sponsor/invite/:token.
   Celular: convite, dados, perfil, pronto. Desktop: convite à esquerda, dados e perfil juntos à direita. */

const LOOKING_FOR = ['Frontend', 'Backend', 'Dados / IA', 'Mobile', 'Design', 'Estágio'];
const STEP1_FIELDS = ['firstName', 'lastName', 'jobTitle', 'email', 'phone', 'password'];

const FEATURES = [
  { icon: ScanLine, color: 'var(--cat-minicurso)', title: 'Escanear crachás', text: 'Cada leitura vira um lead do estande.' },
  { icon: Users, color: 'var(--cat-workshop)', title: 'Leads da equipe', text: 'Avalie, marque tags e chame no WhatsApp.' },
  { icon: LifeBuoy, color: 'var(--cat-ativacao)', title: 'Chamados', text: 'Peça apoio da organização durante o evento.' },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src={iconeTw} alt="" className="h-7 w-[26px] object-contain" />
      <span className="text-[14px] font-extrabold lg:text-[16px]">Tech Week 2026</span>
      <span className="ml-auto text-[12px] font-bold text-text-3">Área do patrocinador</span>
    </div>
  );
}

function StatusScreen({ icon: Icon, tone, title, children, actions }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 pb-6 pt-5 font-sans text-text lg:items-center lg:justify-center lg:pb-12">
      <div className="flex w-full flex-1 flex-col lg:max-w-[480px] lg:flex-none">
        <Brand />
        <div className="mo-up mt-16 flex flex-col items-center text-center lg:mt-12" style={{ '--i': 0 }}>
          <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>
            <Icon size={40} aria-hidden="true" strokeWidth={2.2} />
          </span>
          <h1 className="m-0 mt-5 text-[24px] font-extrabold">{title}</h1>
          <div className="mt-2 text-[14px] leading-relaxed text-text-2">{children}</div>
        </div>
        <div className="mo-up mt-auto flex flex-col gap-1.5 pt-8 lg:mt-8" style={{ '--i': 2 }}>{actions}</div>
      </div>
    </div>
  );
}

const PRIMARY = 'press mo-hover flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-action text-[16px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60 no-underline';
const LINK_BTN = 'flex min-h-11 items-center justify-center text-[14px] font-bold text-link no-underline';

export default function SponsorInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | ready | invalid | expired | done
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(0); // celular: 0 convite, 1 dados, 2 perfil (desktop mostra 1 e 2 juntos)
  const [form, setForm] = useState({
    firstName: '', lastName: '', jobTitle: '', email: '', phone: '', password: '', linkedin: '', lookingFor: [], terms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null); // { message, retry? }
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState({ file: null, preview: null });
  const [rawImage, setRawImage] = useState(null);
  const [doneName, setDoneName] = useState('');
  const createdHere = useRef(false);
  const verificationSent = useRef(false);
  const fileInput = useRef(null);
  const termsRef = useRef(null);

  const load = useCallback(() => {
    setPhase('loading');
    setLoadError(null);
    getInvite(token)
      .then((data) => {
        setInvite(data);
        if (data.email) setForm((f) => ({ ...f, email: data.email }));
        setPhase('ready');
      })
      .catch((err) => {
        const code = inviteErrorCode(err);
        if (code === 'INVITE_EXPIRED') setPhase('expired');
        else if (code === 'INVITE_INVALID') setPhase('invalid');
        else { setLoadError(inviteErrorMessage(err)); setPhase('invalid'); }
      });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const emailLockedValue = !!(invite?.emailLocked && invite?.email);
  const domain = invite?.emailDomain ? String(invite.emailDomain).replace(/^@/, '').toLowerCase() : '';
  const emailNorm = normalizeEmail(form.email);
  const domainOk = !!domain && emailNorm.endsWith(`@${domain}`);
  const strength = getPasswordStrength(form.password);

  const validate = () => {
    const e = {};
    if (!isValidName(form.firstName)) e.firstName = 'Informe seu nome.';
    if (!isValidName(form.lastName)) e.lastName = 'Informe seu sobrenome.';
    if (form.jobTitle.trim().length < 2) e.jobTitle = 'Informe seu cargo na empresa.';
    if (!isValidEmail(form.email)) e.email = 'Informe um e-mail válido.';
    else if (domain && !domainOk) e.email = `Use um e-mail @${domain}, o domínio do convite.`;
    if (!isValidPhone(form.phone)) e.phone = 'Informe o WhatsApp com DDD.';
    if (!strength.valid) e.password = 'A senha precisa ter pelo menos 6 caracteres.';
    if (!form.terms) e.terms = 'Aceite o termo para criar a conta.';
    return e;
  };

  const goNext = () => {
    const e = validate();
    const s1 = Object.fromEntries(Object.entries(e).filter(([k]) => STEP1_FIELDS.includes(k)));
    setErrors(s1);
    if (Object.keys(s1).length === 0) { setStep(2); window.scrollTo(0, 0); }
  };

  const handleFile = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const v = validateAvatarFile(file);
    if (!v.valid) {
      setFormError({ message: v.reason === 'too_large' ? 'A foto precisa ter até 2 MB.' : 'Envie uma imagem PNG, JPEG ou WebP.' });
      return;
    }
    setFormError(null);
    setRawImage(URL.createObjectURL(file));
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      if (Object.keys(e).some((k) => STEP1_FIELDS.includes(k))) {
        setStep(1);
      } else if (e.terms) {
        termsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      // 1. Conta no Firebase Auth (ou reaproveita a sessão criada numa tentativa anterior).
      if (!(auth.currentUser && normalizeEmail(auth.currentUser.email) === emailNorm)) {
        const res = await signUpWithEmail({
          email: emailNorm, password: form.password,
          metadata: { first_name: form.firstName.trim(), last_name: form.lastName.trim() },
        });
        if (res.status === 'signed_in') {
          createdHere.current = true;
        } else if (res.error?.code === 'auth/email-already-in-use') {
          // Quem criou a conta e parou no meio volta aqui: se a senha confere, continua de onde parou.
          const login = await loginWithEmailAndPassword(emailNorm, form.password);
          if (!login.success) {
            setFormError({ message: 'Esse e-mail já tem conta e a senha não confere. Entre pelo login com a senha que você já definiu.', login: true });
            setStep(1);
            setBusy(false);
            return;
          }
        } else {
          setFormError({ message: res.message || 'Não foi possível criar a conta.' });
          setStep(1);
          setBusy(false);
          return;
        }
      }

      // 2. Foto opcional (falha de upload não trava o cadastro; data URL não vai pro servidor).
      let photoURL;
      if (photo.file && auth.currentUser) {
        try {
          const url = await uploadUserAvatar(auth.currentUser.uid, photo.file);
          if (/^https?:/.test(url || '')) photoURL = url;
        } catch { /* segue sem foto */ }
      }

      // 3. Aceite do convite com o ID token do usuário recém-criado (api.js anexa o Bearer).
      // Após confirmar o e-mail, recarrega o usuário e renova o token para o claim email_verified chegar.
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true).catch(() => {});
      }
      await acceptInvite(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        jobTitle: form.jobTitle.trim(),
        phone: form.phone,
        ...(photoURL ? { photoURL } : {}),
        ...(form.linkedin.trim() ? { linkedin: form.linkedin.trim() } : {}),
        ...(form.lookingFor.length ? { lookingFor: form.lookingFor } : {}),
        termsAccepted: true,
      });
      await auth.currentUser?.getIdToken(true).catch(() => {}); // pega o papel SPONSOR
      setDoneName(form.firstName.trim());
      setPhase('done');
      window.scrollTo(0, 0);
    } catch (err) {
      const code = inviteErrorCode(err);
      if (isRetryableAccept(err)) {
        // Conta existe e segue logada: o próximo toque só refaz o aceite.
        const extra = code === 'ROLE_PARTIALLY_UPDATED' ? ' Toque em tentar de novo; se persistir, fale com a organização.' : '';
        if (code === 'EMAIL_NOT_VERIFIED' && auth.currentUser && !verificationSent.current) {
          verificationSent.current = true;
          await sendEmailVerification(auth.currentUser).catch(() => { verificationSent.current = false; });
        }
        setFormError({ message: inviteErrorMessage(err) + extra, retry: true });
      } else {
        // Falha definitiva: desfaz a conta criada agora pra não deixar login órfão sem equipe.
        if (createdHere.current) { await deleteCurrentUserAccount(); createdHere.current = false; }
        if (code === 'INVITE_EXPIRED') setPhase('expired');
        else if (code === 'INVITE_INVALID') setPhase('invalid');
        else {
          setFormError({ message: inviteErrorMessage(err), login: code === 'ALREADY_REGISTERED' });
          if (code === 'EMAIL_MISMATCH' || code === 'EMAIL_DOMAIN_NOT_ALLOWED') setStep(1);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---------- telas de status ---------- */
  if (phase === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-text-3" role="status" aria-live="polite">
        <Loader2 size={28} className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Carregando convite</span>
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <StatusScreen
        icon={Clock}
        tone="var(--warn)"
        title="Esse convite expirou"
        actions={<Link to="/login" className={LINK_BTN}>Voltar para o login</Link>}
      >
        <p className="m-0">Convites valem 7 dias. Peça um novo para quem cuida do estande na sua empresa ou fale com a organização.</p>
        <p className="m-0 mt-5 rounded-[14px] bg-surface p-3.5 text-left text-[13px] text-text-3">
          Se você é participante, o cadastro é outro: use o e-mail do ingresso Sympla em <Link to="/cadastro" className="font-bold text-link no-underline">Criar conta</Link>.
        </p>
      </StatusScreen>
    );
  }

  if (phase === 'invalid') {
    return (
      <StatusScreen
        icon={AlertTriangle}
        tone="var(--err)"
        title={loadError ? 'Não deu para abrir o convite' : 'Convite inválido'}
        actions={(
          <>
            {loadError && <button type="button" onClick={load} className={PRIMARY}>Tentar de novo</button>}
            <Link to="/login" className={LINK_BTN}>Voltar para o login</Link>
          </>
        )}
      >
        <p className="m-0">{loadError || 'Esse link não corresponde a um convite ativo. Confira se copiou o endereço inteiro ou peça um novo à organização.'}</p>
      </StatusScreen>
    );
  }

  if (phase === 'done') {
    return (
      <StatusScreen
        icon={Check}
        tone="var(--ok)"
        title={`Conta criada, ${doneName}`}
        actions={<button type="button" onClick={() => navigate('/sponsor')} className={PRIMARY}>Ir para o estande <ChevronRight size={18} aria-hidden="true" /></button>}
      >
        <p className="m-0">Você já faz parte da equipe do estande.</p>
        <div className="mt-7 flex items-center gap-3.5 rounded-[20px] bg-surface p-[18px] text-left">
          <LogoPlate src={invite.logoUrl} name={invite.sponsorName} height={44} />
          <div className="min-w-0 text-[13px]">
            <div className="truncate font-bold text-text">{invite.sponsorName}</div>
            <div><TierText tier={invite.tier} />{invite.booth?.code && <span className="text-text-3"> · Estande {invite.booth.code}</span>}</div>
          </div>
        </div>
      </StatusScreen>
    );
  }

  /* ---------- convite + formulário ---------- */
  const boothLine = invite.booth ? [`Estande ${invite.booth.code}`, invite.booth.area].filter(Boolean).join(' · ') : '';
  const validUntil = formatDay(invite.expiresAt);
  const tier = TIERS[invite.tier] ? invite.tier : 'PRATA';
  const termLabel = `Uso os dados dos leads só para recrutamento da ${invite.sponsorName}, como pede a LGPD.`;

  const toggleTag = (t) => set('lookingFor', form.lookingFor.includes(t) ? form.lookingFor.filter((x) => x !== t) : [...form.lookingFor, t]);
  const showStep1 = step === 1;
  const showStep2 = step === 2;

  return (
    <div className="min-h-dvh bg-bg font-sans text-text lg:flex">
      {/* Coluna do convite (celular: etapa 0) */}
      <aside className={`${step === 0 ? 'flex' : 'hidden'} flex-col gap-6 px-5 pb-0 pt-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[520px] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:gap-7 lg:border-r lg:border-line lg:bg-nav lg:p-12`}>
        <Brand />
        <div className="mo-up" style={{ '--i': 0 }}>
          <h1 className="m-0 text-[24px] font-extrabold leading-tight lg:text-[30px]">Convite para a equipe do estande</h1>
          <p className="m-0 mt-2.5 text-[14px] leading-relaxed text-text-2 lg:text-[15px]">Essa conta é só para quem trabalha no estande. Ela não usa ingresso do Sympla.</p>
        </div>
        <div className="mo-up overflow-hidden rounded-[20px] border border-line bg-surface" style={{ '--i': 1 }}>
          <div aria-hidden="true" style={tierRule(tier)} />
          <div className="flex flex-col items-start gap-3.5 p-[18px]">
            <LogoPlate src={invite.logoUrl} name={invite.sponsorName} height={54} />
            <div className="text-[13px]">
              <div className="mb-1 text-[16px] font-extrabold">{invite.sponsorName}</div>
              <div><TierText tier={tier} />{boothLine && <span className="text-text-3"> · {boothLine}</span>}</div>
              <div className="mt-1.5 text-text-3">Convite enviado pela organização{validUntil && ` · vale até ${validUntil}`}</div>
            </div>
          </div>
        </div>
        <div className="mo-up" style={{ '--i': 2 }}>
          <h2 className="m-0 mb-3.5 text-[13px] font-extrabold text-text-3">O que você vai poder fazer</h2>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {FEATURES.map(({ icon: Icon, color, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                  <Icon size={18} aria-hidden="true" strokeWidth={1.9} />
                </span>
                <span>
                  <span className="block text-[14px] font-bold">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-text-3">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sticky bottom-0 -mx-5 mt-auto bg-bg px-5 pb-5 pt-3 lg:hidden">
          <button type="button" onClick={() => { setStep(1); window.scrollTo(0, 0); }} className={PRIMARY}>Criar conta de patrocinador</button>
          <Link to="/login" className={`${LINK_BTN} mt-1.5`}>Já tenho conta · Entrar</Link>
        </div>
      </aside>

      {/* Formulário (celular: etapas 1 e 2; desktop: tudo junto) */}
      <main className={`${step === 0 ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col lg:flex lg:items-center lg:px-12 lg:py-14`}>
        <form onSubmit={submit} noValidate className="flex w-full flex-1 flex-col lg:max-w-[560px] lg:flex-none">
          {/* Cabeçalho do celular */}
          <header className="grid grid-cols-[44px_1fr_44px] items-center px-3 pt-2.5 lg:hidden">
            <button type="button" aria-label="Voltar" onClick={() => { setStep(step - 1); window.scrollTo(0, 0); }} className="flex h-11 w-11 items-center justify-center text-text">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div className="text-center text-[13px] font-bold text-text-2" aria-live="polite">Etapa {step} de 2</div>
            <span />
          </header>
          <div className="mx-5 mt-2 grid grid-cols-2 gap-1.5 lg:hidden" aria-hidden="true">
            <span className="h-[5px] rounded-[3px] bg-action" />
            <span className={`h-[5px] rounded-[3px] ${step === 2 ? 'bg-action' : 'bg-surface-raised'}`} />
          </div>

          <div className="px-5 pt-5 lg:p-0">
            <h2 className="m-0 text-[24px] font-extrabold">
              <span className="lg:hidden">{showStep1 ? 'Seus dados' : 'Seu perfil no estande'}</span>
              <span className="hidden lg:inline">Crie sua conta</span>
            </h2>
            <p className="m-0 mt-1.5 text-[14px] text-text-2 lg:hidden">{showStep1 ? 'É assim que a equipe e a organização veem você.' : 'Ajuda os alunos a saber com quem estão falando.'}</p>
          </div>

          {formError && (
            <div role="alert" className="mx-5 mt-4 flex gap-2.5 rounded-[14px] bg-surface p-3.5 text-[13px] leading-relaxed text-text-2 lg:mx-0">
              <AlertTriangle size={18} aria-hidden="true" className="mt-px shrink-0 text-err" />
              <span>
                {formError.message}
                {formError.login && <> <Link to="/login" className="font-bold text-link no-underline">Entrar</Link></>}
              </span>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4 px-5 pt-5 lg:flex-none lg:p-0 lg:pt-5">
            {/* Seus dados */}
            <section className={`${showStep1 ? 'flex' : 'hidden'} flex-col gap-3.5 lg:flex lg:gap-4`} aria-label="Seus dados">
              <Field label="Empresa">
                {(id) => (
                  <div className="flex h-[52px] items-center rounded-[14px] border-[1.5px] border-line-2 bg-surface-raised px-4 text-[15px] text-text-3">
                    <span id={id} className="truncate">{invite.sponsorName}</span>
                    <Lock size={16} aria-label="Campo travado" className="ml-auto shrink-0 text-text-4" />
                  </div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5">
                <Field label="Nome">
                  {(id) => (<><input id={id} className="field" autoComplete="given-name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} aria-invalid={!!errors.firstName} />{errors.firstName && <p className="field-error">{errors.firstName}</p>}</>)}
                </Field>
                <Field label="Sobrenome">
                  {(id) => (<><input id={id} className="field" autoComplete="family-name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} aria-invalid={!!errors.lastName} />{errors.lastName && <p className="field-error">{errors.lastName}</p>}</>)}
                </Field>
              </div>
              <div className="grid gap-3.5 lg:grid-cols-2">
                <Field label="Cargo" aside={<span className="text-[12px] font-bold text-text-3">obrigatório</span>}>
                  {(id) => (<><input id={id} className="field" autoComplete="organization-title" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} aria-invalid={!!errors.jobTitle} />{errors.jobTitle && <p className="field-error">{errors.jobTitle}</p>}</>)}
                </Field>
                <Field label="WhatsApp">
                  {(id) => (<><input id={id} className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} aria-invalid={!!errors.phone} />{errors.phone ? <p className="field-error">{errors.phone}</p> : <p className="m-0 mt-1.5 text-[13px] text-text-3">Os candidatos veem esse número quando você manda mensagem.</p>}</>)}
                </Field>
              </div>
              <Field label="E-mail da empresa">
                {(id) => (
                  <>
                    <div className="relative">
                      <input
                        id={id}
                        className="field pr-11"
                        type="email"
                        autoComplete="email"
                        readOnly={emailLockedValue}
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        aria-invalid={!!errors.email}
                        style={emailLockedValue || (domain && domainOk) ? { borderColor: 'var(--ok)' } : undefined}
                      />
                      {(emailLockedValue || (domain && domainOk)) && <Check size={18} aria-hidden="true" strokeWidth={2.4} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ok" />}
                    </div>
                    {errors.email && <p className="field-error">{errors.email}</p>}
                    {!errors.email && domain && domainOk && <p className="m-0 mt-1.5 text-[13px] font-semibold text-ok">Domínio igual ao do convite</p>}
                    {!errors.email && domain && !domainOk && <p className="m-0 mt-1.5 text-[13px] text-text-3">Só aceita e-mails @{domain}.</p>}
                    {!errors.email && !domain && invite.emailLocked && !emailLockedValue && <p className="m-0 mt-1.5 text-[13px] text-text-3">Use o e-mail que recebeu o convite.</p>}
                  </>
                )}
              </Field>
              <Field label="Senha">
                {(id) => (
                  <>
                    <input id={id} className="field" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!errors.password} />
                    {errors.password && <p className="field-error">{errors.password}</p>}
                    {form.password && (
                      <div className="mt-2 flex items-center gap-2 text-[13px] text-text-2" aria-live="polite">
                        <span className="grid grid-cols-4 gap-1" aria-hidden="true">
                          {[1, 2, 3, 4].map((n) => (
                            <span key={n} className="h-1 w-[22px] rounded-sm" style={{ background: n <= strength.score ? (strength.score >= 3 ? 'var(--ok)' : strength.score === 2 ? 'var(--warn)' : 'var(--err)') : 'var(--surface-raised)' }} />
                          ))}
                        </span>
                        Senha {strength.label.toLowerCase()}
                      </div>
                    )}
                  </>
                )}
              </Field>
            </section>

            {/* Perfil */}
            <section className={`${showStep2 ? 'flex' : 'hidden'} flex-col gap-3.5 lg:flex lg:gap-4`} aria-label="Seu perfil no estande">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileInput.current?.click()} aria-label="Escolher foto de perfil" className="press relative h-[72px] w-[72px] shrink-0 rounded-full">
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface-raised text-[24px] font-extrabold" style={{ boxShadow: 'inset 0 0 0 2px var(--line-2)' }}>
                    {photo.preview ? <img src={photo.preview} alt="" className="h-full w-full object-cover" /> : initials(`${form.firstName} ${form.lastName}`.trim() || '?')}
                  </span>
                  <span className="absolute -bottom-1 -right-1 flex h-[30px] w-[30px] items-center justify-center rounded-full border-[3px] border-bg bg-surface-selected"><ImagePlus size={14} aria-hidden="true" /></span>
                </button>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
                <span>
                  <span className="block text-[15px] font-bold">Foto (opcional)</span>
                  <span className="mt-0.5 block text-[13px] text-text-3">Aparece no crachá digital do estande</span>
                </span>
              </div>
              <Field label="LinkedIn" hint="Opcional.">
                {(id) => <input id={id} className="field" inputMode="url" autoComplete="off" placeholder="linkedin.com/in/seu-perfil" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />}
              </Field>
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="field-label mb-2 p-0">O que você procura nos alunos</legend>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR.map((t) => {
                    const on = form.lookingFor.includes(t);
                    return (
                      <button key={t} type="button" aria-pressed={on} onClick={() => toggleTag(t)} className={`press mo-hover inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13px] font-bold ${on ? 'border-link bg-surface-selected text-link' : 'border-line-2 bg-transparent text-text-2'}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div ref={termsRef} className="pb-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-[14px] bg-surface p-3.5 ${errors.terms ? 'outline outline-1 outline-err' : ''}`}>
                  <input type="checkbox" className="peer sr-only" checked={form.terms} onChange={(e) => set('terms', e.target.checked)} aria-invalid={!!errors.terms} />
                  <span aria-hidden="true" className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-link ${form.terms ? 'bg-action' : 'border-[1.5px] border-field-line bg-field'}`}>
                    {form.terms && <Check size={14} strokeWidth={3} color="#fff" />}
                  </span>
                  <span className="text-[13px] leading-relaxed text-text-2">
                    {termLabel} <Link to="/termos" target="_blank" className="font-bold text-link no-underline">Ler termo</Link>
                  </span>
                </label>
                {errors.terms && <p className="field-error hidden lg:block">{errors.terms}</p>}
              </div>
            </section>
          </div>

          {/* Ações: celular fixa no rodapé; desktop em linha */}
          <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 bg-bg px-5 pb-5 pt-3 lg:static lg:mt-5 lg:flex-row lg:items-center lg:gap-3 lg:bg-transparent lg:p-0">
            {!showStep1 && errors.terms && (
              <p role="alert" className="m-0 rounded-xl border border-err/35 bg-[#1B1630] px-3.5 py-2.5 text-[13px] font-semibold text-err shadow-lg lg:hidden">
                {errors.terms}
              </p>
            )}
            {showStep1 && (
              <button type="button" onClick={goNext} className={`${PRIMARY} lg:hidden`}>Continuar <ChevronRight size={18} aria-hidden="true" /></button>
            )}
            <button type="submit" disabled={busy} className={`${PRIMARY} ${showStep1 ? 'hidden lg:flex' : ''} lg:min-h-[52px] lg:w-auto lg:rounded-[14px] lg:px-[18px] lg:text-[15px] lg:font-bold`}>
              {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? 'Criando conta' : formError?.retry ? 'Tentar de novo' : 'Criar conta'}
            </button>
            <Link to="/login" className={`${LINK_BTN} hidden lg:flex`}>Já tenho conta</Link>
          </div>
        </form>
      </main>

      {rawImage && (
        <AvatarCropperModal
          imageSrc={rawImage}
          onCropComplete={(file, preview) => { setPhoto({ file, preview }); setRawImage(null); }}
          onClose={() => setRawImage(null)}
        />
      )}
    </div>
  );
}
