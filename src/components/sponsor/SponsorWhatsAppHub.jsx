import { useState, useMemo, useCallback } from 'react';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Sparkles,
  Briefcase,
  Calendar,
  Code2,
  FileText
} from 'lucide-react';
import { buildWhatsAppLink, sanitizeBrazilianPhone } from '../../lib/whatsapp';
import { WhatsAppIcon } from '../WhatsAppButton';

export const WHATSAPP_TEMPLATES = [
  {
    id: 'thanks_jobs',
    title: 'Agradecimento & Vagas',
    icon: Briefcase,
    template: (name, company) => 
      `Olá, ${name}! Obrigado por visitar o estande da ${company} na FACOM TechWeek! Adoramos conversar com você. Fique à vontade para conferir nossas vagas abertas e manter contato: https://techweek.facom.ufu.br`
  },
  {
    id: 'interview_invite',
    title: 'Convite para Entrevista',
    icon: Calendar,
    template: (name, company) => 
      `Olá, ${name}! Aqui é da equipe da ${company}. Ficamos muito bem impressionados com o seu perfil na TechWeek e gostaríamos de marcar um bate-papo técnico rápido de 15 minutos. Qual o seu melhor horário esta semana?`
  },
  {
    id: 'tech_challenge',
    title: 'Desafio Técnico',
    icon: Code2,
    template: (name, company) => 
      `Olá, ${name}! Muito legal ter você no estande da ${company}! Segue o link com as instruções do nosso desafio técnico da TechWeek: https://techweek.facom.ufu.br/desafio`
  },
  {
    id: 'stand_material',
    title: 'Material do Estande',
    icon: FileText,
    template: (name, company) => 
      `Olá, ${name}! Foi ótimo trocar uma ideia com você no estande da ${company} na TechWeek. Aqui está a nossa apresentação sobre engenharia, stacks e cultura técnica: https://techweek.facom.ufu.br`
  }
];

export default function SponsorWhatsAppHub({
  phone,
  participantName = 'Participante',
  companyName = 'Nossa Empresa',
  onSent,
  compact = false,
  className = ''
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(WHATSAPP_TEMPLATES[0].id);
  const [customText, setCustomText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const cleanFirstName = useMemo(() => {
    return (participantName || 'Participante').trim().split(' ')[0];
  }, [participantName]);

  const sanitizedPhone = useMemo(() => {
    return sanitizeBrazilianPhone(phone);
  }, [phone]);

  const hasValidPhone = Boolean(sanitizedPhone);

  const activeTemplate = useMemo(() => {
    return WHATSAPP_TEMPLATES.find((t) => t.id === selectedTemplateId) || WHATSAPP_TEMPLATES[0];
  }, [selectedTemplateId]);

  const activeMessage = useMemo(() => {
    if (customText.trim()) return customText;
    return activeTemplate.template(cleanFirstName, companyName || 'nossa empresa');
  }, [customText, activeTemplate, cleanFirstName, companyName]);

  const whatsappUrl = useMemo(() => {
    if (!hasValidPhone) return null;
    return buildWhatsAppLink(phone, cleanFirstName, companyName, activeMessage);
  }, [hasValidPhone, phone, cleanFirstName, companyName, activeMessage]);

  const handleCopy = useCallback(async () => {
    if (!activeMessage) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(activeMessage);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch (_) {}
  }, [activeMessage]);

  const handleOpenWhatsApp = useCallback(() => {
    if (!whatsappUrl) return;
    if (onSent) onSent(activeMessage);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [whatsappUrl, onSent, activeMessage]);

  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    const chosen = WHATSAPP_TEMPLATES.find((t) => t.id === id);
    if (chosen) {
      setCustomText(chosen.template(cleanFirstName, companyName || 'nossa empresa'));
    }
  };

  return (
    <div className={`sponsor-whatsapp-hub flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised/40 p-3.5 sm:p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <WhatsAppIcon size={18} color="#25D366" />
          </span>
          <div>
            <div className="text-[13px] font-extrabold text-text">WhatsApp Outreach 1-Click</div>
            <div className="text-[11px] text-text-3">
              {hasValidPhone ? `Telefone: ${phone}` : 'Participante sem telefone válido'}
            </div>
          </div>
        </div>

        {hasValidPhone && (
          <button
            type="button"
            onClick={handleCopy}
            className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-bold text-text-2 hover:text-text"
            title="Copiar texto da mensagem"
          >
            {isCopied ? <Check size={13} className="text-[#6FD8A6]" /> : <Copy size={13} />}
            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        )}
      </div>

      {/* Template Selector Chips */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {WHATSAPP_TEMPLATES.map((tmpl) => {
          const isCurrent = tmpl.id === selectedTemplateId;
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tmpl.id)}
              className={`press flex items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-bold transition-all ${
                isCurrent
                  ? 'border-link/60 bg-surface-selected text-text shadow-[0_2px_8px_rgba(143,160,255,0.15)]'
                  : 'border-border/60 bg-surface text-text-3 hover:text-text-2'
              }`}
            >
              <Icon size={13} className={isCurrent ? 'text-link' : 'text-text-4'} />
              <span className="truncate">{tmpl.title}</span>
            </button>
          );
        })}
      </div>

      {/* Editable Message Area */}
      <div className="flex flex-col gap-1">
        <textarea
          rows={compact ? 2 : 3}
          value={activeMessage}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Mensagem contextualizada..."
          className="w-full resize-none rounded-xl border border-field-line bg-field p-2.5 text-[12px] leading-relaxed text-text placeholder-text-4 focus:border-link focus:outline-none"
        />
        <div className="flex justify-between text-[10px] text-text-4">
          <span>Personalize se desejar antes de enviar</span>
          <span>{activeMessage.length} caracteres</span>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        disabled={!hasValidPhone}
        className={`press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-[13px] font-extrabold text-white transition-all ${
          hasValidPhone
            ? 'bg-gradient-to-r from-[#25D366] to-[#128C7E] shadow-[0_6px_20px_rgba(37,211,102,0.25)] hover:brightness-105 active:scale-[0.99]'
            : 'cursor-not-allowed border border-border bg-surface-raised text-text-4'
        }`}
      >
        <WhatsAppIcon size={18} color={hasValidPhone ? '#ffffff' : '#6E779A'} />
        <span>{hasValidPhone ? 'Iniciar Conversa no WhatsApp' : 'WhatsApp Indisponível'}</span>
        {hasValidPhone && <ExternalLink size={14} className="opacity-80" />}
      </button>
    </div>
  );
}

