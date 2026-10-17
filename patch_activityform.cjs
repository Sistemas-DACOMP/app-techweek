const fs = require('fs');
const file = 'src/pages/admin/ActivityForm.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = "onChange={(e) => setRow(0, { location: e.target.value })}";
const replacement = "onChange={(e) => { const loc = e.target.value; setRow(0, { location: loc }); const locObj = locations.find(l => l.name === loc); if (locObj && locObj.capacity) { set({ capacity: locObj.capacity }); } }}";

if(content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched ActivityForm.jsx");
} else {
    console.log("Target not found");
}
