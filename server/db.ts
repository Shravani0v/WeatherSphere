import fs from 'fs';
import path from 'path';

// Local JSON File Database helper to guarantee persistence in the preview environment
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory and file exist
function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: [],
      favorites: [],
      history: []
    }, null, 2));
  }
}

initDb();

function readData() {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], favorites: [], history: [] };
  }
}

function writeData(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to JSON DB:', err);
  }
}

export const dbStore = {
  getUsers: () => readData().users,
  saveUser: (user: any) => {
    const data = readData();
    data.users.push(user);
    writeData(data);
    return user;
  },
  findUserByEmail: (email: string) => {
    return readData().users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id: string) => {
    return readData().users.find((u: any) => u.id === id);
  },

  getFavorites: (userId: string) => {
    return readData().favorites.filter((f: any) => f.userId === userId);
  },
  addFavorite: (favorite: any) => {
    const data = readData();
    data.favorites.push(favorite);
    writeData(data);
    return favorite;
  },
  removeFavorite: (userId: string, favoriteId: string) => {
    const data = readData();
    const index = data.favorites.findIndex((f: any) => f.id === favoriteId && f.userId === userId);
    if (index !== -1) {
      data.favorites.splice(index, 1);
      writeData(data);
      return true;
    }
    return false;
  },
  checkIsFavorite: (userId: string, cityName: string) => {
    return readData().favorites.some((f: any) => f.userId === userId && f.cityName.toLowerCase() === cityName.toLowerCase());
  },

  getHistory: (userId: string) => {
    return readData().history
      .filter((h: any) => h.userId === userId)
      .sort((a: any, b: any) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())
      .slice(0, 15); // Limit to 15 recent logs
  },
  addHistory: (historyLog: any) => {
    const data = readData();
    data.history.push(historyLog);
    writeData(data);
    return historyLog;
  },
  clearHistory: (userId: string) => {
    const data = readData();
    data.history = data.history.filter((h: any) => h.userId !== userId);
    writeData(data);
    return true;
  }
};
