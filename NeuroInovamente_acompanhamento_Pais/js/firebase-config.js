import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDm7VR8D-2q-fokFeeUmD8HT3_msKM0wvE",
  authDomain: "resgitro-de-aluno-neurotalk.firebaseapp.com",
  projectId: "resgitro-de-aluno-neurotalk",
  storageBucket: "resgitro-de-aluno-neurotalk.firebasestorage.app",
  messagingSenderId: "755316657255",
  appId: "1:755316657255:web:495a47e4a412b22f8858c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getFirestore(app);


export { app, auth, db, firebaseConfig };