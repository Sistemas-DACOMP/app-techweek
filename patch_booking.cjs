const fs = require('fs');
const file = 'backend/src/routes/booking.ts';
let content = fs.readFileSync(file, 'utf8');

const target5 = `      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : defaultActivity;
      const isOpenEvent = Boolean(activityData.isOpenEvent);`;

const replacement5 = `      const activityData = activitySnap.exists ? (activitySnap.data() ?? {}) : defaultActivity;
      const isOpenEvent = Boolean(activityData.isOpenEvent !== undefined ? activityData.isOpenEvent : defaultActivity?.isOpenEvent);`;

if (content.includes(target5)) {
    content = content.replace(target5, replacement5);
    fs.writeFileSync(file, content);
    console.log("Patched booking.ts for Bug 6");
} else {
    console.log("Target 5 not found in booking.ts");
}
