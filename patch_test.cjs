const fs = require('fs');
const file = 'tests/unit/openEventAndAgendaConversion.test.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/screen\.getByText\(\/Entrada Livre\/i\)/g, 'screen.getAllByText(/Entrada Livre/i)[0]');
fs.writeFileSync(file, content);
console.log("Patched test");
