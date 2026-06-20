import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore} from "firebase/firestore";

const firebaseConfig = {

  apiKey:
    "AIzaSyAh0sS_77jJcnON8MVcuEru1N8Ie-73grs",

  authDomain:
    "skyline-library.firebaseapp.com",

  projectId:
    "skyline-library",

  storageBucket:
    "skyline-library.firebasestorage.app",

  messagingSenderId:
    "392003757697",

  appId:
    "1:392003757697:web:b1f9abd9425f0cfF390f80"

};

const app =
  initializeApp(firebaseConfig);

export const db =
  getFirestore(app);
  export const storage =
  getStorage(app);