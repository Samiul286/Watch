import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDy7VUqZ6f4P08TEzCQ2ZOr7b-ZGhd_gBg",
  authDomain: "watchtogether-9e396.firebaseapp.com",
  databaseURL: "https://watchtogether-9e396-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "watchtogether-9e396",
  storageBucket: "watchtogether-9e396.firebasestorage.app",
  messagingSenderId: "233756845608",
  appId: "1:233756845608:web:73a06f904977542dfc371d",
  measurementId: "G-36G6W70W73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
export default app;