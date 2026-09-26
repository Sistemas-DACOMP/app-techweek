# REG-UI-001: Modais e Pop-ups Fixos com Scroll Lock (KAN-77)

## Status: CONFIRMADA

## Contexto
Em dispositivos móveis com telas touch, ao abrir qualquer pop-up ou modal (`LectureModal`, `NotificationModal`, `FeedbackModal`, `activeManualChallenge`, etc.), os gestos de arrastar verticalmente a tela causavam o deslocamento indevido do modal junto com a rolagem da página subjacente (*scroll chaining* e vazamento de eventos de toque).

## Regra
1. **Fixação e Sobreposição Absoluta**:
   Todo pop-up/modal da aplicação deve ser exibido com posicionamento fixo (`modal-overlay-fixed`) cobrindo 100% da viewport (`width: 100vw; height: 100dvh; position: fixed; inset: 0; z-index: 99999;`).
2. **Backdrop Estático**:
   O fundo escurecido/borrado (backdrop) do modal deve possuir `overflow: hidden; touch-action: none; overscroll-behavior: contain;`. Arrastar o dedo sobre o backdrop não desloca o modal nem a página.
3. **Bloqueio de Rolagem de Fundo (Scroll Lock)**:
   Enquanto qualquer modal estiver visível (`isOpen === true`), a rolagem do `document.body` e dos containers da página (`.page-container`, `.login-container`) deve ser completamente travada através do hook `useScrollLock` / módulo `scrollLock`.
4. **Rolagem Interna Confinada**:
   Apenas o card interno do modal (`modal-card-fixed`) pode rolar verticalmente caso seu conteúdo ultrapasse a altura máxima da tela (`max-height: 85dvh; overflow-y: auto; touch-action: pan-y; overscroll-behavior: contain;`), sem nunca propagar o scroll para o fundo.
5. **Suporte a Múltiplos Modais**:
   O gerenciador de scroll lock utiliza contagem de referências (`activeLocks`) para permitir abertura encadeada de modais (ex: `FeedbackModal` exibido sobre o formulário de `Challenges`) sem liberar indevidamente a rolagem até que todos os modais sejam fechados.

