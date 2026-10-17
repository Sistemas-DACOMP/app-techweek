const fs = require('fs');
const file = 'src/pages/Agenda.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetBadge = `          ) : isLockedForUser ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[11px] font-extrabold text-gold shadow-[0_1px_4px_rgba(217,119,6,0.2)]">
              <Lock size={11} aria-hidden="true" />
              Desbloquear
            </span>
          ) : showLight ? (`;

const replacementBadge = `          ) : isLockedForUser ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[11px] font-extrabold text-gold shadow-[0_1px_4px_rgba(217,119,6,0.2)]">
              <Lock size={11} aria-hidden="true" />
              Desbloquear
            </span>
          ) : act.isOpenEvent ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 bg-ok/15 px-2.5 py-0.5 text-[11px] font-extrabold text-ok">
              Entrada Livre
            </span>
          ) : showLight ? (`;

if (content.includes(targetBadge)) {
    content = content.replace(targetBadge, replacementBadge);
    fs.writeFileSync(file, content);
    console.log("Patched Agenda.jsx for Bug 6 badge");
} else {
    console.log("Target badge not found in Agenda");
}
