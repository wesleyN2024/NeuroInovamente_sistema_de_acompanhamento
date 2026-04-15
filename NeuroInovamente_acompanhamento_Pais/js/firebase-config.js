// Importa a função para inicializar o Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

// Importa o serviço de autenticação do Firebase
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Importa o serviço de banco de dados Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Configuração do Firebase (dados do seu projeto)
const firebaseConfig = {
  apiKey: "AIzaSyDm7VR8D-2q-fokFeeUmD8HT3_msKM0wvE", // Chave da API do Firebase
  authDomain: "resgitro-de-aluno-neurotalk.firebaseapp.com", // Domínio de autenticação
  projectId: "resgitro-de-aluno-neurotalk", // ID do projeto
  storageBucket: "resgitro-de-aluno-neurotalk.firebasestorage.app", // Bucket de armazenamento
  messagingSenderId: "755316657255", // ID do remetente de mensagens
  appId: "1:755316657255:web:495a47e4a412b22f8858c2" // ID do app
};

// Inicializa o Firebase com as configurações acima
const app = initializeApp(firebaseConfig);

// Inicializa o serviço de autenticação
const auth = getAuth(app);

// Inicializa o banco de dados Firestore
const db = getFirestore(app);

// Exporta os serviços para serem usados em outros arquivos
export { app, auth, db, firebaseConfig };
