import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Printer, CheckCircle2, Lock } from 'lucide-react';
import logoTw from '../assets/logo-tw.png';

export default function Terms({ isModal = false, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('terms'); // 'terms' | 'lgpd'

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleBack = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className="terms-page animate-fade-in" 
      style={{
        minHeight: isModal ? 'auto' : '100vh',
        background: '#0a0d14',
        color: '#f8fafc',
        padding: isModal ? '16px' : '40px 16px 60px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '860px',
          background: '#0f141f',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Top Actions & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              <CheckCircle2 size={13} /> Documento Oficial Validável 2026
            </span>

            <button
              onClick={handlePrint}
              title="Imprimir ou Salvar PDF"
              className="no-print"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem'
              }}
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img 
            src={logoTw} 
            alt="FACOM Tech Week 2026" 
            style={{ height: '42px', width: 'auto', marginBottom: '12px' }} 
          />
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc', margin: '0 0 6px 0' }}>
            Termos de Uso e Política de Privacidade LGPD
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            Faculdade de Computação — Universidade Federal de Uberlândia (FACOM // UFU)
          </p>
        </div>

        {/* Tab Switcher */}
        <div 
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            marginBottom: '28px'
          }}
        >
          <button
            onClick={() => setActiveTab('terms')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'terms' ? '#1e293b' : 'transparent',
              color: activeTab === 'terms' ? '#38bdf8' : '#94a3b8',
              fontWeight: activeTab === 'terms' ? '600' : '400',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={16} /> Termos de Uso do App
          </button>
          <button
            onClick={() => setActiveTab('lgpd')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'lgpd' ? '#1e293b' : 'transparent',
              color: activeTab === 'lgpd' ? '#10b981' : '#94a3b8',
              fontWeight: activeTab === 'lgpd' ? '600' : '400',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={16} /> Privacidade & LGPD
          </button>
        </div>

        {/* Content Section: Termos de Uso */}
        {activeTab === 'terms' && (
          <div className="terms-body" style={{ fontSize: '0.88rem', lineHeight: '1.65', color: '#cbd5e1' }}>
            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                1. Objeto e Aceitação dos Termos
              </h3>
              <p style={{ margin: 0 }}>
                Ao criar uma conta ou utilizar a aplicação móvel e web da <strong>FACOM Tech Week 2026</strong>, mantida e operada pela comissão organizadora da Faculdade de Computação da Universidade Federal de Uberlândia (FACOM/UFU), você declara ter lido, compreendido e concordado expressamente com estes Termos de Uso e com a nossa Política de Privacidade.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                2. Cadastro, Elegibilidade e Veracidade das Informações
              </h3>
              <p style={{ marginBottom: '8px' }}>
                O acesso às funcionalidades completas do aplicativo (como check-in em atividades por QR Code, participação na feira de carreiras, submissão no Hackathon e acúmulo de pontos XP) exige cadastro válido contendo:
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Nome e sobrenome completos;</li>
                <li>E-mail válido e ativo (preferencialmente o mesmo e-mail utilizado na plataforma Sympla para emissão de ingressos);</li>
                <li>Telefone / WhatsApp com DDD;</li>
                <li>Vínculo institucional (Aluno UFU, Aluno externo, Servidor/Professor ou Comunidade Externa).</li>
              </ul>
              <p style={{ marginTop: '8px', margin: 0 }}>
                O usuário responsabiliza-se inteiramente pela veracidade, exatidão e atualização dos dados fornecidos.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                3. Credenciamento, Leitura de QR Code e Gamificação
              </h3>
              <p style={{ margin: 0 }}>
                O aplicativo disponibiliza um crachá digital e leitores de QR Code para validação presencial de presença nas palestras, minicursos, miniauditórios e estandes de patrocinadores. A pontuação (XP), conquistas e níveis do ranking dependem da presença real e auditável. A tentativa de burlar leituras de QR Code, clonar tokens temporários ou usar automação maliciosa resultará em desclassificação imediata do ranking e suspensão da conta.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                4. Código de Conduta do Evento
              </h3>
              <p style={{ margin: 0 }}>
                Todos os participantes comprometem-se a manter um ambiente respeitoso, inclusivo e seguro no aplicativo, nos fóruns de discussão, no feed oficial do evento e nas interações presenciais no campus da UFU. São estritamente proibidos conteúdos discriminatórios, ofensivos ou difamatórios.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                5. Propriedade Intelectual
              </h3>
              <p style={{ margin: 0 }}>
                Os elementos visuais, código-fonte, mascotes institucionais (Alan & Ada), logos da FACOM Tech Week e da UFU são de propriedade exclusiva da Universidade Federal de Uberlândia e/ou de seus licenciadores, sendo proibida a reprodução não autorizada.
              </p>
            </section>
          </div>
        )}

        {/* Content Section: LGPD */}
        {activeTab === 'lgpd' && (
          <div className="lgpd-body" style={{ fontSize: '0.88rem', lineHeight: '1.65', color: '#cbd5e1' }}>
            <div 
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <Lock size={18} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                <strong>Termo de Consentimento LGPD (Lei nº 13.709/2018):</strong> Seus dados pessoais são protegidos com padrões elevados de segurança e tratados estritamente para as finalidades institucionais da FACOM Tech Week.
              </div>
            </div>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                1. Agente de Tratamento e Controlador dos Dados
              </h3>
              <p style={{ margin: 0 }}>
                O controlador responsável pelo tratamento dos dados pessoais coletados neste aplicativo é a <strong>Comissão Organizadora da FACOM Tech Week / Faculdade de Computação da Universidade Federal de Uberlândia (FACOM/UFU)</strong>, localizada no Campus Santa Mônica, Uberlândia - MG.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                2. Dados Pessoais Coletados e Finalidades
              </h3>
              <p style={{ marginBottom: '8px' }}>
                Em conformidade com o Artigo 7º da LGPD, os dados coletados são tratados estritamente para as seguintes finalidades legítimas:
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li><strong>Nome, e-mail e telefone/WhatsApp:</strong> identificação do participante, emissão do crachá digital, contato operacional sobre horários/alterações de grade e envio de avisos sobre o evento;</li>
                <li><strong>Curso, período e instituição:</strong> personalização da experiência acadêmica e direcionamento de atividades relevantes;</li>
                <li><strong>Registros de presença (QR Code):</strong> comprovação de frequência para fins de emissão de certificados oficiais de extensão;</li>
                <li><strong>Foto de perfil (avatar):</strong> personalização do crachá digital e exibição no ranking gamificado do evento;</li>
                <li><strong>LinkedIn e Instagram (opcionais):</strong> facilitação de networking e conexões profissionais entre os inscritos.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                3. Compartilhamento de Dados e Oportunidades
              </h3>
              <p style={{ margin: 0 }}>
                A FACOM Tech Week não vende dados pessoais. O compartilhamento de contatos (e-mail/LinkedIn) com empresas patrocinadoras oficiais ocorre exclusivamente para participantes inscritos na trilha do Hackathon ou estandes da Feira de Carreiras, objetivando a divulgação de vagas de estágio, trainee e recrutamento técnico, sempre respeitando o legítimo interesse e consentimento.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: '600', marginBottom: '8px' }}>
                4. Segurança, Retenção e Direitos do Titular (Art. 18 LGPD)
              </h3>
              <p style={{ marginBottom: '8px' }}>
                Os dados são armazenados em infraestrutura segura com controle de acesso restrito. Como titular dos dados, você tem o direito de, a qualquer momento:
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Confirmar a existência de tratamento e acessar seus dados;</li>
                <li>Solicitar a correção de dados incompletos ou inexatos;</li>
                <li>Solicitar a eliminação dos seus dados pessoais ao término do evento;</li>
                <li>Revogar o consentimento prestado.</li>
              </ul>
              <p style={{ marginTop: '8px', margin: 0 }}>
                Para exercer seus direitos, entre em contato com a organização pelo e-mail oficial: <code style={{ color: '#38bdf8' }}>techweek@facom.ufu.br</code>.
              </p>
            </section>
          </div>
        )}

        {/* Footer */}
        <div 
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.78rem',
            color: '#64748b'
          }}
        >
          <div>
            FACOM Tech Week 2026 // UFU — Faculdade de Computação
          </div>
          <div>
            Última atualização: Setembro de 2026
          </div>
        </div>
      </div>
    </div>
  );
}
