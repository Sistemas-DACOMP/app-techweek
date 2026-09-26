# FACOM Tech Week App

📱 **Aplicativo oficial da FACOM Tech Week (UFU)** — projetado para engajar os participantes por meio de um sistema interativo de grade de atividades em tempo real, reservas, missões gamificadas, networking e presença via QR Code.

---

## 🌐 Ambientes e Acesso

- 🚀 **Produção:** [https://sistemas-dacomp.github.io/app-techweek/](https://sistemas-dacomp.github.io/app-techweek/)
- 🧪 **Homologação:** [https://app-techweek-homolog.vercel.app](https://app-techweek-homolog.vercel.app)

---

## 🎯 Funcionalidades Principais

* **Catálogo de Atividades em Tempo Real (Grade Completa):** Visualização de palestras, minicursos, workshops e ativações com contagem de vagas em tempo real via `onSnapshot`, filtros rápidos por tipo e data.
* **Minha Agenda & Reserva Atômica:** Inscrição síncrona com feedback reativo imediato (< 300ms) com garantia anti-overbooking e lista de espera automática. Acompanhamento de status de presença (*Inscrito*, *Entrada Confirmada*, *Presença Concluída*).
* **Double Check de Presença:** Sistema de segurança de presença em duas etapas (Entrada registrada pelo Staff na portaria + Checkout do aluno escaneando o QR dinâmico HMAC-SHA256 projetado no telão).
* **Crachá Digital e QR Code Individual:** Cada participante possui seu crachá com QR Code exclusivo para identificação rápida e networking.
* **Gamificação e Ranking em Tempo Real:** Conquista de pontos por presença em palestras, missões de estandes e desafios, com ranking ao vivo atualizado em tempo real.
* **Missoes e Networking Inteligente:** Desafios de conexão entre participantes de diferentes cursos/períodos e ativações em estandes de empresas patrocinadoras.
* **Integração com Ingressos Sympla:** Validação e vinculação automática do ingresso oficial do evento.

---

## 🛠️ Tecnologias Utilizadas

### Frontend (PWA / Mobile-First)
* **React 19 & Vite:** Interface moderna, reativa e de alta performance.
* **React Router DOM 7:** Gerenciamento de rotas e navegação SPA fluida.
* **Firebase SDK v12:** Conexão direta com Firestore (listeners `onSnapshot`), Firebase Auth e Cloud Storage.
* **Html5-Qrcode & QRCode.react:** Leitura nativa pela câmera e renderização vetorial de QR Codes.
* **Lucide React:** Biblioteca de ícones padronizada e moderna.
* **CSS Puro / Liquid Glass:** Design system responsivo com estética Liquid Glass, glassmorphism e tema escuro moderno.

### Backend Serverless (`backend/`)
* **Node.js & TypeScript:** Arquitetura monolítica modular e fortemente tipada.
* **Firebase Cloud Functions (2ª Geração) + Express:** API REST serverless com endpoints protegidos por autenticação JWT e validação de roles (`ADMIN`, `STAFF`, `SPONSOR`, `PARTICIPANT`).
* **Firebase Admin SDK:** Transações atômicas de reserva, controle de concorrência e pontuação segura.
* **HMAC-SHA256 Screen Tokens:** Emissão e validação de tokens temporários de 5 minutos para projeção no telão das salas.
* **Rate Limiter:** Proteção contra abusos e requisições excessivas (`express-rate-limit`).

### Banco de Dados, Armazenamento e Infra
* **Cloud Firestore:** Banco NoSQL em tempo real protegido por regras de segurança declarativas ([`firestore.rules`](firestore.rules)).
* **Cloud Storage:** Armazenamento de avatares e comprovantes com validação de tamanho e tipo ([`storage.rules`](storage.rules)).
* **Firebase Authentication:** Autenticação segura por e-mail e senha.
* **Firebase Emulator Suite:** Ambiente de desenvolvimento 100% local e offline (Auth, Firestore, Storage, Functions).

### Qualidade de Código & Testes
* **Vitest:** Suíte de testes unitários e de integração automatizados.
* **Oxlint:** Linter ultrarrápido para garantia de boas práticas e integridade de código.
* **Quality Gate Script:** Pipeline de checagem automática (`npm run quality-gate`).

---

## 💻 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* Node.js 20 ou superior
* Java JRE/JDK (necessário para os emuladores locais do Firestore/Storage)

### 2. Instalação
```bash
# Clone o repositório
git clone https://github.com/Sistemas-DACOMP/app-techweek.git

# Acesse a pasta do projeto
cd app-techweek

# Instale as dependências do frontend e do backend
npm install
npm --prefix backend install
```

### 3. Configuração do Ambiente Local
Copie os arquivos de exemplo para criar suas variáveis locais:
```bash
cp .env.example .env.local
cp backend/.env.example backend/.env.local
```

### 4. Executando com os Emuladores do Firebase (Recomendado)
Em terminais separados:

```bash
# Terminal 1: Iniciar os emuladores do Firebase (Auth, Firestore, Storage, Functions)
npm run emulators

# Terminal 2: Popular as atividades e missões de teste no banco local
npm run seed:activities
npm run seed:missions

# Terminal 3: Iniciar o servidor de desenvolvimento do PWA
npm run dev
```

O PWA estará acessível em `http://localhost:5173` e o painel visual dos emuladores em `http://localhost:4000`.

---

## 🧪 Testes e Quality Gate

```bash
# Executar suíte de testes unitários
npm run test

# Executar quality gate completo (lint + build + testes frontend e backend)
npm run quality-gate
```

---

## 📄 Licença e Organização

Desenvolvido com 💙 pela equipe de tecnologia da **FACOM - Faculdade de Computação (UFU)** para a **FACOM Tech Week**.
