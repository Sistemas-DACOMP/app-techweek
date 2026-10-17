const fs = require('fs');
const file = 'src/lib/activityService.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = "const baseList = (firestoreList && firestoreList.length > 0) ? firestoreList : DEFAULT_ACTIVITIES;";
const replacement1 = "const baseList = firestoreList && firestoreList.length > 0 ? [...DEFAULT_ACTIVITIES.filter(da => !firestoreList.some(fa => fa.id === da.id)), ...firestoreList] : DEFAULT_ACTIVITIES;";

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    fs.writeFileSync(file, content);
    console.log("Patched Bug 1 in activityService.js");
} else {
    console.log("Target 1 not found");
}

