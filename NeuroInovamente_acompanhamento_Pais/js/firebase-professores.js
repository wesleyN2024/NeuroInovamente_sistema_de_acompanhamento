import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  protegerPaginaProfessores();
  ajustarMenuPorPerfil();
  configurarCadastroProfessoresFirestore();
});

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

function protegerPaginaProfessores() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "professores.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksPais = document.querySelectorAll('a[href="painel-pais.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  if (usuario.perfil !== "Coordenação") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksPais.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

function limparFormularioProfessorCadastro() {
  const campos = [
    "#nome-professor",
    "#funcao-professor",
    "#turma-professor",
    "#email-professor",
    "#telefone-professor"
  ];

  campos.forEach((seletor) => {
    const campo = document.querySelector(seletor);
    if (campo) campo.value = "";
  });

  const perfil = document.querySelector("#perfil-professor");
  const status = document.querySelector("#status-professor");
  const disciplina = document.querySelector("#disciplina-professor");

  if (perfil) perfil.value = "Professor";
  if (status) status.value = "Ativo";
  if (disciplina) disciplina.value = "";
}

async function configurarCadastroProfessoresFirestore() {
  const botaoSalvar = document.querySelector("#btn-salvar-professor");
  const botaoLimpar = document.querySelector("#btn-limpar-professor");
  const lista = document.querySelector("#lista-professores");

  if (!botaoSalvar || !lista) return;

  await renderizarProfessoresFirestore();

  botaoSalvar.addEventListener("click", async () => {
    const nome = document.querySelector("#nome-professor").value.trim();
    const funcao = document.querySelector("#funcao-professor").value.trim();
    const turma = document.querySelector("#turma-professor").value.trim();
    const disciplina = document.querySelector("#disciplina-professor").value;
    const email = document.querySelector("#email-professor").value.trim().toLowerCase();
    const telefone = document.querySelector("#telefone-professor").value.trim();
    const perfil = document.querySelector("#perfil-professor").value;
    const status = document.querySelector("#status-professor").value;

    if (!nome || !funcao || !email) {
      alert("Preencha os campos principais do usuário.");
      return;
    }

    if (perfil === "Professor" && !disciplina) {
      alert("Selecione a disciplina do professor.");
      return;
    }

    try {
      const emailJaExiste = await getDocs(
        query(collection(db, "usuarios"), where("email", "==", email))
      );

      if (!emailJaExiste.empty) {
        alert("Já existe um usuário autorizado com esse e-mail.");
        return;
      }

      await addDoc(collection(db, "usuarios"), {
        nome,
        funcao,
        turma: perfil === "Pais" ? "" : turma,
        disciplina: perfil === "Professor" ? disciplina : "",
        email,
        telefone,
        perfil,
        status,
        criadoEm: new Date().toISOString()
      });

      limparFormularioProfessorCadastro();
      await renderizarProfessoresFirestore();

      alert("Usuário autorizado com sucesso.");
    } catch (erro) {
      console.error("Erro ao cadastrar usuário:", erro);
      alert("Erro ao salvar usuário autorizado no Firebase.");
    }
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFormularioProfessorCadastro);
  }
}

async function renderizarProfessoresFirestore() {
  const lista = document.querySelector("#lista-professores");
  if (!lista) return;

  lista.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    if (snapshot.empty) {
      lista.innerHTML = `
        <tr>
          <td colspan="8">Nenhum usuário autorizado ainda.</td>
        </tr>
      `;
      return;
    }

    let encontrou = false;

    snapshot.forEach((docSnap) => {
      const usuario = docSnap.data();

      if (
        usuario.perfil !== "Professor" &&
        usuario.perfil !== "Coordenação" &&
        usuario.perfil !== "Pais"
      ) {
        return;
      }

      encontrou = true;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${usuario.nome || "-"}</td>
        <td>${usuario.funcao || "-"}</td>
        <td>${usuario.turma || "-"}</td>
        <td>${usuario.disciplina || "-"}</td>
        <td>${usuario.email || "-"}</td>
        <td>${usuario.perfil || "-"}</td>
        <td>${usuario.status || "-"}</td>
        <td>
          <button class="btn-acao-excluir" data-id="${docSnap.id}">Excluir</button>
        </td>
      `;
      lista.appendChild(tr);
    });

    if (!encontrou) {
      lista.innerHTML = `
        <tr>
          <td colspan="8">Nenhum usuário autorizado ainda.</td>
        </tr>
      `;
      return;
    }

    lista.querySelectorAll(".btn-acao-excluir").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.id;
        const confirmar = confirm("Deseja realmente excluir este usuário autorizado?");
        if (!confirmar) return;

        try {
          await deleteDoc(doc(db, "usuarios", id));
          await renderizarProfessoresFirestore();
          alert("Usuário removido da lista do sistema.");
        } catch (erro) {
          console.error("Erro ao excluir usuário:", erro);
          alert("Erro ao excluir usuário.");
        }
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);
    lista.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar usuários autorizados.</td>
      </tr>
    `;
  }
}