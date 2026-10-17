const fs = require('fs');
const file = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const target4 = `    const targetActivity = activities.find((a) => a.id === activityId);
    const isOpen = Boolean(targetActivity?.isOpenEvent);

    if (!hasSymplaTicket && !isOpen) {
      setShowSymplaModal(true);
      return;
    }`;

const replacement4 = `    const targetActivity = activities.find((a) => a.id === activityId);
    const isOpen = Boolean(targetActivity?.isOpenEvent);

    if (!hasSymplaTicket && !isOpen) {
      setShowSymplaModal(true);
      return;
    }

    // Check conflict
    if (targetActivity) {
      const myAgendaActivities = activities.filter((act) => {
        const s = calculateActivityStatus(act.id, bookings, checkins, pointEvents);
        return s === 'BOOKED' || s === 'CHECKED_IN' || s === 'COMPLETED';
      });
      const conflictingActivity = myAgendaActivities.find((bookedAct) => {
        if (bookedAct.id === targetActivity.id) return false;
        return bookedAct.day === targetActivity.day && bookedAct.time === targetActivity.time;
      });
      
      if (conflictingActivity) {
        setToastMessage({ 
          type: 'warning', 
          message: \`Você já está inscrito em "\${conflictingActivity.title}" neste mesmo horário. Cancele a anterior para reservar esta.\` 
        });
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }
    }`;

if (content.includes(target4)) {
    content = content.replace(target4, replacement4);
    fs.writeFileSync(file, content);
    console.log("Patched Dashboard.jsx for Bug 3");
} else {
    console.log("Target 4 not found in Dashboard");
}
