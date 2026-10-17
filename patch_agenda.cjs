const fs = require('fs');
const file = 'src/pages/Agenda.jsx';
let content = fs.readFileSync(file, 'utf8');

const target3 = `    if (conflictingActivity) {
      setToastMessage({ 
        type: 'warning', 
        message: \`Atenção: você já possui "\${conflictingActivity.title}" neste mesmo horário.\` 
      });
    }`;

const replacement3 = `    if (conflictingActivity) {
      setToastMessage({ 
        type: 'warning', 
        message: \`Você já está inscrito em "\${conflictingActivity.title}" neste mesmo horário. Cancele a anterior para reservar esta.\` 
      });
      setTimeout(() => setToastMessage(null), 5000);
      return; // Bloqueia a inscrição
    }`;

if (content.includes(target3)) {
    content = content.replace(target3, replacement3);
    fs.writeFileSync(file, content);
    console.log("Patched Agenda.jsx for Bug 3");
} else {
    console.log("Target 3 not found in Agenda");
}
