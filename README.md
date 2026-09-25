# FACOM Tech Week App

🔗 **Acesso ao App (Ao Vivo):** [https://ShayeneFigueredo.github.io/app-techweek/](https://ShayeneFigueredo.github.io/app-techweek/)

Aplicativo oficial para a FACOM Tech Week, projetado para engajar os participantes por meio de um sistema interativo de missoes e conexoes.

## Visao Geral

O projeto foi construio com React e Vite, visando uma experiencia rapida e fluida para estudantes, professores, patrocinadores e visitantes. O sistema foca no networking gamificado, onde os usuarios completam desafios durante a semana de tecnologia para acumular pontos.

## Funcionalidades Principais

* Cadastro e Perfil: Criacao de perfil de participante definindo curso, tipo de vinculo (Alunos da UFU, Alunos de fora, Servidores, etc.) e periodo.
* QR Code Dinamico: Cada usuario recebe um QR Code individual no formato JSON encapsulando seus dados.
* Missoes de Networking: Sistema inteligente onde participantes escaneiam os QR Codes uns dos outros para desbloquear conquistas de forma automatizada (ex: conectar com alguem de outro curso, conhecer um calouro, interagir com alguem de fora da instituicao).
* Visitas aos Estandes: Missoes direcionadas a empresas patrocinadoras (Kanastra, Sankhya, Neospace, Levty, Sebrae, etc.), envolvendo a leitura de QR Codes oficiais nos estandes.
* Desafios Interativos: Modalidades de desafios onde os usuarios precisam responder questionarios especificos sobre vagas e tecnologias interagindo diretamente com pessoas do evento.
* Validacao e Ranking: Aquisicao automatica de pontos e historico de conexoes feitas.
* Missoes Secretas: Lembretes visuais de missoes escondidas que recompensam atencao redobrada pelo evento.

## Tecnologias Utilizadas

* React + Vite: Base da aplicacao, configurada para otima performance.
* React Router DOM: Gerenciamento de rotas e navegacao no estilo Single Page Application.
* Firebase: Servicos de banco de dados (Firestore), autenticacao e storage (BaaS). Backend serverless em `backend/` (Express + Cloud Functions).
* Html5-Qrcode: Modulo acoplado para leitura e parsing de QR Codes nativo pelo navegador do usuario.
* Lucide React: Pacote de icones padronizados e vetorizados.

## Como Executar o Projeto Localmente

1. Clone o repositorio.

2. Acesse o diretorio principal e instale as dependencias instaladas:
   npm install

3. Inicie o servidor de desenvolvimento:
   npm run dev

4. O Vite disponibilizara um link de acesso local (geralmente http://localhost:5173) no seu terminal.

## Variaveis de Ambiente

Copie `.env.example` para `.env.local` e preencha com as chaves do seu projeto Firebase (Console do Firebase > Configuracoes do Projeto > Seus Aplicativos > Web). Ver `docs/GUIA_DEV_EMULADORES.md` pro guia completo de ambiente local (Firebase Emulator Suite) e pro backend em `backend/`.
