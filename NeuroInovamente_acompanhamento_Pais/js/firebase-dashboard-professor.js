import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  protegerPaginaProfessor();
  ajustarMenuPorPerfil();
  preencherDataAtual();
  await carregarDashboardProfessor();
});

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

function protegerPaginaProfessor() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "dashboard-professor.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Professor") {
    alert("Acesso restrito ao professor.");
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

  if (usuario.perfil === "Professor") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksPais.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

function preencherDataAtual() {
  const campoData = document.querySelector("#data-atual-professor");
  if (!campoData) return;

  const hoje = new Date();
  campoData.textContent = hoje.toLocaleDateString("pt-BR");
}

async function carregarDashboardProfessor() {
  const usuario = obterUsuarioLogado();

  const campoNome = document.querySelector("#nome-professor-painel");
  const campoDisciplina = document.querySelector("#disciplina-professor-painel");
  const campoTotal = document.querySelector("#total-alunos-professor");
  const textoDisciplina = document.querySelector("#texto-disciplina-professor");
  const resumoProfessor = document.querySelector("#resumo-professor");

  if (!usuario || usuario.perfil !== "Professor") return;

  if (campoNome) {
    campoNome.textContent = usuario.nome || "Professor";
  }

  if (campoDisciplina) {
    campoDisciplina.textContent = usuario.disciplina || "Não definida";
  }

  if (textoDisciplina) {
    textoDisciplina.textContent = usuario.disciplina
      ? `Você está vinculado à disciplina ${usuario.disciplina}.`
      : "Nenhuma disciplina foi vinculada ao seu cadastro ainda.";
  }

  try {
    const q = query(
      collection(db, "alunos"),
      where("disciplina", "==", usuario.disciplina || "")
    );

    const snapshot = await getDocs(q);
    const totalAlunos = snapshot.size;

    if (campoTotal) {
      campoTotal.textContent = totalAlunos;
    }

    if (resumoProfessor) {
      resumoProfessor.textContent = usuario.disciplina
        ? `Você está vinculado à disciplina ${usuario.disciplina} e atualmente possui ${totalAlunos} aluno(s) relacionado(s) a essa disciplina no sistema.`
        : "Seu cadastro ainda não possui uma disciplina vinculada no sistema.";
    }
  } catch (erro) {
    console.error("Erro ao carregar dashboard do professor:", erro);

    if (campoTotal) {
      campoTotal.textContent = "0";
    }

    if (resumoProfessor) {
      resumoProfessor.textContent = "Erro ao carregar os dados do professor.";
    }
  }
}