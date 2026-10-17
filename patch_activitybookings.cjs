const fs = require('fs');
const file = 'src/lib/activityService.js';
let content = fs.readFileSync(file, 'utf8');

const target2 = `    // Suplementa com bookedActivities de usuários se a collection bookings ainda estiver vazia
    let effectiveBookings = [...rawBookings];
    if (effectiveBookings.length === 0 && usersList.length > 0) {`;

const replacement2 = `    // Suplementa com bookedActivities de usuários se a collection bookings ainda estiver vazia
    let effectiveBookings = [...rawBookings];
    if (effectiveBookings.length === 0 && usersList.length === 0) {
      if (!isUnsubscribed) {
        import('firebase/firestore').then(({ getDocs, collection }) => {
          getDocs(collection(db, 'users')).then(snap => {
            const fetchedList = snap.docs.map(d => ({id: d.id, ...d.data()}));
            for (const u of fetchedList) {
              const bEntry = u.bookedActivities?.[primaryId] || (secondaryId && u.bookedActivities?.[secondaryId]);
              if (bEntry) {
                effectiveBookings.push({
                  id: \`\${u.uid || u.id}_\${primaryId}\`,
                  userId: u.uid || u.id,
                  activityId: primaryId,
                  status: bEntry.status || 'CONFIRMED',
                  position: bEntry.position || null,
                  createdAt: bEntry.bookedAt || bEntry.createdAt || null
                });
                fetchedUsersMap.set(u.uid || u.id, u);
              }
            }
            if (effectiveBookings.length > 0) {
              rawBookings = effectiveBookings; // Update rawBookings so next emit uses it
              emit();
            }
          });
        });
      }
    } else if (effectiveBookings.length === 0 && usersList.length > 0) {`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    fs.writeFileSync(file, content);
    console.log("Patched Bug 4 in activityService.js");
} else {
    console.log("Target 2 not found");
}

