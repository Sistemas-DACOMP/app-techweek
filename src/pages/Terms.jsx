import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Lock } from 'lucide-react';
import '../styles/entrada.css';

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base leading-snug font-bold text-text">{title}</h2>
      {children}
    </section>
  );
}

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
    <div className={`w-full bg-bg text-text ${isModal ? 'min-h-full' : 'h-full overflow-y-auto'}`}>
      <div className="mx-auto w-full max-w-[720px] px-5 pb-12">
        <header className="grid grid-cols-[44px_1fr_44px] items-center pt-2.5">
          <button type="button" onClick={handleBack} aria-label="Voltar" className="flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent text-text">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <span />
          <button type="button" onClick={handlePrint} aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF" className="no-print flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-text-2">
            <Printer size={20} aria-hidden="true" />
          </button>
        </header>

        <h1 className="screen-title mt-2 mb-1">Termos e privacidade</h1>
        <p className="mb-[22px] text-center text-[13px] text-text-3">FACOM Tech Week 2026 · UFU · atualizado em setembro de 2026</p>

        <div className="ds-tabs mb-6" role="tablist" aria-label="Documento">
          <button type="button" role="tab" id="tab-terms" aria-controls="panel-terms" aria-selected={activeTab === 'terms'} className="ds-tab" onClick={() => setActiveTab('terms')}>
            Termos de uso
          </button>
          <button type="button" role="tab" id="tab-lgpd" aria-controls="panel-lgpd" aria-selected={activeTab === 'lgpd'} className="ds-tab" onClick={() => setActiveTab('lgpd')}>
            Privacidade e LGPD
          </button>
        </div>

        {/* Content Section: Termos de Uso */}
        {activeTab === 'terms' && (
          <div id="panel-terms" role="tabpanel" aria-labelledby="tab-terms" className="text-[15px] leading-relaxed text-text-2">
            <Section title="1. Objeto e aceitação dos termos">
              <p>
                Ao criar uma conta ou utilizar a aplicação móvel e web da <strong className="text-text">FACOM Tech Week 2026</strong>, mantida e operada pela comissão organizadora da Faculdade de Computação da Universidade Federal de Uberlândia (FACOM/UFU), você declara ter lido, compreendido e concordado expressamente com estes Termos de Uso e com a nossa Política de Privacidade.
              </p>
            </Section>

            <Section title="2. Cadastro, elegibilidade e veracidade das informações">
              <p className="mb-2">
                O acesso às funcionalidades completas do aplicativo (como check-in em atividades por QR Code, participação na feira de carreiras, submissão no Hackathon e acúmulo de pontos XP) exige cadastro válido contendo:
              </p>
              <ul className="list-disc pl-5">
                <li>Nome e sobrenome completos;</li>
                <li>E-mail válido e ativo (preferencialmente o mesmo e-mail utilizado na plataforma Sympla para emissão de ingressos);</li>
                <li>Telefone / WhatsApp com DDD;</li>
                <li>Vínculo institucional (Aluno UFU, Aluno externo, Servidor/Professor ou Comunidade Externa).</li>
              </ul>
              <p className="mt-2">
                O usuário responsabiliza-se inteiramente pela veracidade, exatidão e atualização dos dados fornecidos.
              </p>
            </Section>

            <Section title="3. Credenciamento, leitura de QR Code e gamificação">
              <p>
                O aplicativo disponibiliza um crachá digital e leitores de QR Code para validação presencial de presença nas palestras, minicursos, miniauditórios e estandes de patrocinadores. A pontuação (XP), conquistas e níveis do ranking dependem da presença real e auditável. A tentativa de burlar leituras de QR Code, clonar tokens temporários ou usar automação maliciosa resultará em desclassificação imediata do ranking e suspensão da conta.
              </p>
            </Section>

            <Section title="4. Código de conduta do evento">
              <p>
                Todos os participantes comprometem-se a manter um ambiente respeitoso, inclusivo e seguro no aplicativo, nos fóruns de discussão, no feed oficial do evento e nas interações presenciais no campus da UFU. São estritamente proibidos conteúdos discriminatórios, ofensivos ou difamatórios.
              </p>
            </Section>

            <Section title="5. Propriedade intelectual">
              <p>
                Os elementos visuais, código-fonte, mascotes institucionais (Alan & Ada), logos da FACOM Tech Week e da UFU são de propriedade exclusiva da Universidade Federal de Uberlândia e/ou de seus licenciadores, sendo proibida a reprodução não autorizada.
              </p>
            </Section>
          </div>
        )}

        {/* Content Section: LGPD */}
        {activeTab === 'lgpd' && (
          <div id="panel-lgpd" role="tabpanel" aria-labelledby="tab-lgpd" className="text-[15px] leading-relaxed text-text-2">
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[rgba(111,216,166,0.25)] bg-[rgba(111,216,166,0.08)] px-4 py-3.5">
              <Lock size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
              <p className="text-sm text-text">
                <strong>Termo de Consentimento LGPD (Lei nº 13.709/2018):</strong> seus dados pessoais são protegidos com padrões elevados de segurança e tratados estritamente para as finalidades institucionais da FACOM Tech Week.
              </p>
            </div>

            <Section title="1. Agente de tratamento e controlador dos dados">
              <p>
                O controlador responsável pelo tratamento dos dados pessoais coletados neste aplicativo é a <strong className="text-text">Comissão Organizadora da FACOM Tech Week / Faculdade de Computação da Universidade Federal de Uberlândia (FACOM/UFU)</strong>, localizada no Campus Santa Mônica, Uberlândia - MG.
              </p>
            </Section>

            <Section title="2. Dados pessoais coletados e finalidades">
              <p className="mb-2">
                Em conformidade com o Artigo 7º da LGPD, os dados coletados são tratados estritamente para as seguintes finalidades legítimas:
              </p>
              <ul className="list-disc pl-5">
                <li><strong className="text-text">Nome, e-mail e telefone/WhatsApp:</strong> identificação do participante, emissão do crachá digital, contato operacional sobre horários/alterações de grade e envio de avisos sobre o evento;</li>
                <li><strong className="text-text">Curso, período e instituição:</strong> personalização da experiência acadêmica e direcionamento de atividades relevantes;</li>
                <li><strong className="text-text">Registros de presença (QR Code):</strong> comprovação de frequência para fins de emissão de certificados oficiais de extensão;</li>
                <li><strong className="text-text">Foto de perfil (avatar):</strong> personalização do crachá digital e exibição no ranking gamificado do evento;</li>
                <li><strong className="text-text">LinkedIn e Instagram (opcionais):</strong> facilitação de networking e conexões profissionais entre os inscritos.</li>
              </ul>
            </Section>

            <Section title="3. Compartilhamento de dados e oportunidades">
              <p>
                A FACOM Tech Week não vende dados pessoais. O compartilhamento de contatos (e-mail/LinkedIn) com empresas patrocinadoras oficiais ocorre exclusivamente para participantes inscritos na trilha do Hackathon ou estandes da Feira de Carreiras, objetivando a divulgação de vagas de estágio, trainee e recrutamento técnico, sempre respeitando o legítimo interesse e consentimento.
              </p>
            </Section>

            <Section title="4. Segurança, retenção e direitos do titular (Art. 18 LGPD)">
              <p className="mb-2">
                Os dados são armazenados em infraestrutura segura com controle de acesso restrito. Como titular dos dados, você tem o direito de, a qualquer momento:
              </p>
              <ul className="list-disc pl-5">
                <li>Confirmar a existência de tratamento e acessar seus dados;</li>
                <li>Solicitar a correção de dados incompletos ou inexatos;</li>
                <li>Solicitar a eliminação dos seus dados pessoais ao término do evento;</li>
                <li>Revogar o consentimento prestado.</li>
              </ul>
              <p className="mt-2">
                Para exercer seus direitos, entre em contato com a organização pelo e-mail oficial: <a href="mailto:techweek@facom.ufu.br" className="font-bold text-link">techweek@facom.ufu.br</a>.
              </p>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
