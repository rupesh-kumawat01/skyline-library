firebase.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "skyline-library.firebaseapp.com",
  projectId: "skyline-library",
  storageBucket: "skyline-library.firebasestorage.app",
  messagingSenderId: "392003757697",
  appId: "1:392003757697:web:b1f9abd9425f0cff390f"
};

const app = initializeApp(firebaseConfig);

export default app;