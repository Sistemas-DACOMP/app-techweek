const fs = require('fs');
const file = 'src/pages/Agenda.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetFilters = `      } else if (selectedType !== 'all') {
        const actType = String(act.type || 'palestra').toLowerCase().trim();
        if (actType !== selectedType) return false;
      }
      if (dayFilter !== 'all' && act.day !== dayFilter) return false;`;

const replacementFilters = `      } else if (selectedType !== 'all') {
        const actType = String(act.type || 'palestra').toLowerCase().trim();
        if (selectedType === 'ativacao' && (actType === 'estande' || actType === 'ativacao')) {
          // allow
        } else if (actType !== selectedType) return false;
      }
      
      const isActivation = String(act.type || '').toLowerCase().trim() === 'ativacao' || String(act.type || '').toLowerCase().trim() === 'estande';
      const isContinuous = isActivation && (!act.day || act.day.toLowerCase() === 'todos');
      
      if (dayFilter !== 'all' && act.day !== dayFilter && !isContinuous) return false;`;

const targetGroups = `    visible.forEach((act) => {
      const dayKey = act.day || '';
      const timeKey = act.time || '19:00';`;

const replacementGroups = `    visible.forEach((act) => {
      const isActivation = String(act.type || '').toLowerCase().trim() === 'ativacao' || String(act.type || '').toLowerCase().trim() === 'estande';
      const isContinuous = isActivation && (!act.day || act.day.toLowerCase() === 'todos');
      
      const dayKey = isContinuous && dayFilter !== 'all' ? dayFilter : (act.day || '');
      const timeKey = isContinuous ? '00:00 - Todo o evento' : (act.time || '19:00');`;

if (content.includes(targetFilters) && content.includes(targetGroups)) {
    content = content.replace(targetFilters, replacementFilters);
    content = content.replace(targetGroups, replacementGroups);
    fs.writeFileSync(file, content);
    console.log("Patched Agenda.jsx for Bug 5");
} else {
    console.log("Bug 5 targets not found in Agenda");
}
