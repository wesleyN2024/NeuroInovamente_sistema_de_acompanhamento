// Importa autenticação e banco do Firebase
import { auth, db } from "./firebase-config.js";

// Importa funções de autenticação com Google
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Importa funções do Firestore
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Seleciona o botão de login com Google
const botaoGoogle = document.querySelector("#btn-google-login");

// Função que redireciona o usuário baseado no perfil
function redirecionarPorPerfil(perfil) {

  // Se for professor → dashboard professor
  if (perfil === "Professor") {
    window.location.href = "dashboard-professor.html";

  // Se for coordenação → dashboard coordenação
  } else if (perfil === "Coordenação") {
    window.location.href = "dashboard-coordenacao.html";

  // Se for pais → painel dos pais
  } else if (perfil === "Pais") {
    window.location.href = "painel-pais.html";

  // Caso não seja nenhum perfil válido
  } else {
    alert("Perfil não autorizado no sistema.");
  }
}

// Busca o perfil do usuário no Firestore usando o email
async function buscarPerfilUsuario(email) {

  // Normaliza o email (minúsculo e sem espaços)
  const emailNormalizado = email.trim().toLowerCase();

  // Referência do documento no Firestore
  const usuarioRef = doc(db, "usuarios", emailNormalizado);

  // Busca o documento
  const usuarioSnap = await getDoc(usuarioRef);

  // Se não existir → retorna null
  if (!usuarioSnap.exists()) {
    return null;
  }

  // Dados do usuário
  const dados = usuarioSnap.data();

  // Retorna os dados organizados
  return {
    uid: dados.uid || "",
    nome: dados.nome || "",
    email: dados.email || emailNormalizado,
    perfil: dados.perfil || "",
    disciplina: dados.disciplina || "",
    status: dados.status || ""
  };
}

// Se o botão existir na página
if (botaoGoogle) {

  // Evento de clique no botão
  botaoGoogle.addEventListener("click", async () => {
    try {

      // Mantém o usuário autenticado no Firebase
      await setPersistence(auth, browserLocalPersistence);

      // Cria o provider do Google
      const provider = new GoogleAuthProvider();

      // Força escolha de conta
      provider.setCustomParameters({
        prompt: "select_account"
      });

      // Abre popup de login
      const result = await signInWithPopup(auth, provider);

      // Usuário logado
      const user = result.user;

      // Busca perfil no banco
      const perfilBanco = await buscarPerfilUsuario(user.email);

      // Se não estiver autorizado
      if (!perfilBanco) {
        await signOut(auth);
        alert("Seu e-mail não está autorizado no sistema. Fale com a coordenação.");
        return;
      }

      // Se estiver inativo
      if (perfilBanco.status && perfilBanco.status !== "Ativo") {
        await signOut(auth);
        alert("Seu acesso está inativo no sistema.");
        return;
      }

      // Salva dados no localStorage
      localStorage.setItem("neurotalk_usuario", JSON.stringify({
        uid: user.uid,
        email: (user.email || "").toLowerCase(),
        nome: perfilBanco.nome,
        perfil: perfilBanco.perfil,
        disciplina: perfilBanco.disciplina
      }));

      // Redireciona para o painel correto
      redirecionarPorPerfil(perfilBanco.perfil);

    } catch (error) {

      // Mostra erro no console
      console.error("Erro no login com Google:", error.code, error.message, error);

      // Tratamento de erros específicos
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
