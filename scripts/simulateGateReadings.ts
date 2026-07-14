import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables for the standalone script
dotenv.config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const gateIds = ['A', 'B', 'C', 'D'];
const counts: Record<string, number> = Object.fromEntries(gateIds.map(id => [id, 200]));

console.log('Starting Gate Simulator (Ctrl+C to stop)...');

setInterval(async () => {
  try {
    // Optimization: Concurrent writes via Promise.all
    const promises = gateIds.map(id => {
      const previousCount = counts[id];
      const delta = Math.floor(Math.random() * 60) - 10; 
      counts[id] = Math.max(0, previousCount + delta);

      return setDoc(doc(db, 'gates', id), {
        gateId: id,
        currentCount: counts[id],
        capacity: 1000,
        previousCount,
        secondsSinceLastReading: 5,
        timestampMs: Date.now(),
      });
    });

    await Promise.all(promises);
    console.log(`Tick: Updated ${gateIds.length} gates.`);
  } catch (error) {
    console.error('Simulator error:', error);
  }
}, 5000);