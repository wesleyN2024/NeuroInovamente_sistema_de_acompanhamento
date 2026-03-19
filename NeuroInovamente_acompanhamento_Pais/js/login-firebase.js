import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const botaoGoogle = document.querySelector("#btn-google-login");

function redirecionarPorPerfil(perfil) {
  if (perfil === "Professor") {
    window.location.href = "dashboard-professor.html";
  } else if (perfil === "Coordenação") {
    window.location.href = "dashboard-coordenacao.html";
  } else if (perfil === "Pais") {
    window.location.href = "painel-pais.html";
  } else {
    alert("Perfil não autorizado no sistema.");
  }
}

async function buscarPerfilUsuario(email) {
  const emailNormalizado = email.trim().toLowerCase();
  const q = query(collection(db, "usuarios"), where("email", "==", emailNormalizado));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const dados = snapshot.docs[0].data();

  return {
    uid: dados.uid || "",
    nome: dados.nome || "",
    email: dados.email || emailNormalizado,
    perfil: dados.perfil || "",
    disciplina: dados.disciplina || "",
    status: dados.status || ""
  };
}

if (botaoGoogle) {
  botaoGoogle.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const perfilBanco = await buscarPerfilUsuario(user.email);

      if (!perfilBanco) {
        await signOut(auth);
        alert("Seu e-mail não está autorizado no sistema. Fale com a coordenação.");
        return;
      }

      if (perfilBanco.status && perfilBanco.status !== "Ativo") {
        await signOut(auth);
        alert("Seu acesso está inativo no sistema.");
        return;
      }

      localStorage.setItem("neurotalk_usuario", JSON.stringify({
        uid: user.uid,
        email: (user.email || "").toLowerCase(),
        nome: perfilBanco.nome,
        perfil: perfilBanco.perfil,
        disciplina: perfilBanco.disciplina
      }));

      redirecionarPorPerfil(perfilBanco.perfil);
    } catch (error) {
      console.error("Erro no login com Google:", error.code, error.message, error);

      if (error.code === "auth/unauthorized-domain") {
        alert("Domínio não autorizado no Firebase.");
      } else if (error.code === "auth/popup-blocked") {
        alert("O navegador bloqueou a janela do Google.");
      } else if (error.code === "auth/popup-closed-by-user") {
        alert("A janela de login foi fechada antes de concluir.");
      } else {
        alert("Erro ao entrar com Google.");
      }
    }
  });
}