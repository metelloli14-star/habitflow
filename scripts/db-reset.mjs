// Deletes the mock database file. On the next request the app recreates it from db/seed.ts.
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'db', 'data.json');
if (fs.existsSync(file)) {
  fs.unlinkSync(file);
  console.log('Mock database removed. Restart `npm run dev` — it will be re-seeded with demo data.');
} else {
  console.log('Mock database is already empty.');
}
