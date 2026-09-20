# 🚀 Guia do Desenvolvedor — Ambiente Local com Firebase Emulators & Arquitetura v2.0

> **FACOM Tech Week App**  
> Este guia é o ponto de partida para qualquer desenvolvedor do time configurar seu ambiente local, rodar o backend e o frontend 100% offline e entregar tarefas no padrão de engenharia do projeto.

---

## 🧭 1. Entendendo a Arquitetura do App

O projeto adota uma arquitetura **BaaS Híbrida com Monólito Serverless**, projetada para ser simples (*KISS*), rápida e segura:

```
app-techweek/
├── src/               # 📱 Frontend PWA (React 19 + Vite + Tailwind CSS)
│   ├── lib/firebase.js# Ponto de conexão do cliente (Auth, Firestore, Storage)
│   └── pages/         # Telas do participante, staff, patrocinador e admin
├── backend/           # ☁️ Backend Serverless (Express + TypeScript + Firebase Admin)
│   ├── src/index.ts   # API REST exportada como Cloud Function (onRequest)
│   └── package.json   # Dependências isoladas do servidor (Node 20)
├── firestore.rules    # 🛡️ Firewall de segurança do banco NoSQL
└── firebase.json      # ⚙️ Configuração dos emuladores e deploys
```

### Por que usamos essa divisão?
1. **Frontend PWA (`src/`):** Lê dados públicos (grade de palestras, avisos, ranking) diretamente do Firestore com cache instantâneo e tempo real (`onSnapshot`).
2. **Backend Serverless (`backend/`):** Executa operações críticas que exigem transações atômicas seguras sem risco de fraude ou *overbooking* (reservar vagas, validar check-in de presença, capturar leads com pontuação).
3. **Emuladores Locais:** Permitem que você desenvolva e teste tudo no seu computador sem precisar de internet, sem gastar cotas da nuvem e sem risco de mexer nos dados de outros desenvolvedores.

---

## 🛠️ 2. Pré-requisitos no seu Computador

Certifique-se de ter instalado:
- **Node.js 20+** e **npm** ([nodejs.org](https://nodejs.org/))
- **Java Runtime (JRE/JDK 11+)** *(Obrigatório para rodar o emulador do Firestore)*.
  - *No Windows:* [Instalar Java via Adoptium](https://adoptium.net/)
  - *No Mac:* `brew install openjdk`
  - *No Linux (Ubuntu/Debian):* `sudo apt install default-jre`

---

## ⚡ 3. Configurando o Projeto pela Primeira Vez

Clone o repositório e instale as dependências da raiz e do backend:

```bash
# 1. Instalar dependências do Frontend (PWA)
npm install

# 2. Instalar dependências do Backend Serverless
npm --prefix backend install

# 3. Compilar o TypeScript do backend
npm run backend:build

# 4. Criar seu arquivo de variáveis de ambiente
cp .env.example .env.local
```

> 💡 **Dica:** Para que o Frontend se conecte aos emuladores locais automaticamente durante o desenvolvimento, adicione esta linha no seu `.env.local`:
> ```env
> VITE_USE_FIREBASE_EMULATORS=true
> ```

---

## 🎮 4. Como Rodar o Ambiente Completo (Dia a Dia)

Para trabalhar no projeto, você precisará de **3 terminais** (ou rodar em abas separadas):

### Terminal 1: Iniciar os Emuladores do Firebase
```bash
npm run emulators
# Ou: npx firebase emulators:start
```
*Ele inicializará a Auth (9099), Firestore (8080), Functions (5001) e o Painel Web (4000).*

### Terminal 2: Compilar o Backend em Tempo Real (Watch Mode)
```bash
npm run backend:watch
```
*Qualquer alteração feita nos arquivos em `backend/src/` será recompilada instantaneamente para o emulador.*

### Terminal 3: Iniciar o Frontend Vite (PWA)
```bash
npm run dev
```
*Acesse o app em [http://localhost:5173](http://localhost:5173).*

---

## 🖥️ 5. Usando o Painel Visual do Emulador (localhost:4000)

Abra no seu navegador: 👉 **[http://localhost:4000](http://localhost:4000)**

Este painel é o seu console de superpoderes local:
- **Aba Authentication (`localhost:4000/auth`):** Crie usuários de teste com qualquer e-mail/senha com 1 clique, edite Custom Claims (`role: ADMIN`, `role: STAFF`).
- **Aba Firestore (`localhost:4000/firestore`):** Veja todas as coleções (`/users`, `/activities`, `/bookings`), crie documentos manuais e teste queries em tempo real.
- **Aba Logs:** Veja mensagens de `console.log()` e erros disparados pela API do Express.

---

## 🌿 6. Fluxo de Git e Integração com o Jira

Nosso repositório está integrado ao Jira do projeto (`APP_TechWeek`). Siga sempre este fluxo:

### 1. Criar sua branch a partir da `develop`
```bash
git checkout develop
git pull origin develop
git checkout -b feature/KAN-<NUMERO>-descricao-curta
# Exemplo: git checkout -b feature/KAN-67-auth-middleware
```

### 2. Padrão de Commits (Smart Commits)
Use sempre a tag do Jira no commit para atualizar o card automaticamente:
- `[ADD] KAN-X: implementação de nova funcionalidade`
- `[FIX] KAN-X: correção de bug ou ajuste de regra`
- `[TEST] KAN-X: criação de testes automatizados`

### 3. Rodar o Quality Gate antes do Push
Antes de abrir seu PR, garanta que seu código está limpo:
```bash
npm run quality-gate
```

### 4. Abrir Pull Request
- **Base:** `develop` ⬅️ **Compare:** `feature/KAN-X-...`
- **Título:** `[KAN-X] Nome da Tarefa`

---

## ❓ 7. Perguntas Frequentes (FAQ & Troubleshooting)

#### P: O comando `npm run emulators` dá erro dizendo que o Java não foi encontrado.
> **R:** O emulador do Cloud Firestore roda sobre Java. Instale o JDK no seu sistema operacional e certifique-se de que o comando `java -version` funciona no seu terminal.

#### P: Como testo a rota do Express diretamente no navegador ou Postman?
> **R:** Com o emulador ativo, a rota de teste fica disponível em:  
> `http://127.0.0.1:5001/facom-techweek-layerx/us-east1/api/api/health`

#### P: Meus dados no emulador somem quando fecho o terminal?
> **R:** Por padrão, sim (o banco em memória zera para manter seu ambiente sempre limpo). Se quiser salvar os dados de teste entre sessões, rode:  
> `npx firebase emulators:start --export-on-exit=./emulator-data --import=./emulator-data`

---
*Dúvidas ou sugestões? Converse com o Tech Lead ou mande no canal de desenvolvimento da equipe!*
