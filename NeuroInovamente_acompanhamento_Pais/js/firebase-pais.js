import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await protegerPaginaPais();
  ajustarMenuPorPerfil();
  await carregarPainelPais();
});

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

async function protegerPaginaPais() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "painel-pais.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Pais") {
    alert("Acesso restrito aos pais.");
    window.location.href = "login.html";
  }
}

function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  if (usuario.perfil === "Pais") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

async function buscarUsuarioPorEmail(email) {
  const emailNormalizado = email.trim().toLowerCase();

  const q = query(collection(db, "usuarios"), where("email", "==", emailNormalizado));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}

async function buscarAlunoPorEmailResponsavel(emailResponsavel) {
  const emailNormalizado = emailResponsavel.trim().toLowerCase();

  const q = query(
    collection(db, "alunos"),
    where("responsavelEmail", "==", emailNormalizado)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}

async function carregarPainelPais() {
  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Pais") return;

  try {
    const usuarioBanco = await buscarUsuarioPorEmail(usuario.email);

    if (!usuarioBanco) {
      alert("Cadastro do responsável não encontrado no sistema.");
      return;
    }

    if (usuarioBanco.status && usuarioBanco.status !== "Ativo") {
      alert("Seu acesso está inativo no sistema.");
      window.location.href = "login.html";
      return;
    }

    const aluno = await buscarAlunoPorEmailResponsavel(usuario.email);

    if (!aluno) {
      document.querySelector("#titulo-familia").textContent =
        `Olá, ${usuarioBanco.nome || "família"}`;
      document.querySelector("#subtitulo-painel").textContent =
        "Ainda não há aluno vinculado a este responsável.";
      document.querySelector("#resumo-pais").textContent =
        "Nenhum aluno foi encontrado para este e-mail de responsável.";
      return;
    }

    document.querySelector("#titulo-familia").textContent =
      `Olá, ${usuarioBanco.nome || "família"}`;

    document.querySelector("#subtitulo-painel").textContent =
      `Acompanhe abaixo o desenvolvimento de ${aluno.nome || "seu aluno"}.`;

    document.querySelector("#card-aluno").textContent = aluno.nome || "-";
    document.querySelector("#card-turma").textContent = aluno.turma || "-";
    document.querySelector("#card-status").textContent = aluno.status || "-";

    document.querySelector("#tb-nome").textContent = aluno.nome || "-";
    document.querySelector("#tb-turma").textContent = aluno.turma || "-";
    document.querySelector("#tb-disciplina").textContent = aluno.disciplina || "-";
    document.querySelector("#tb-responsavel").textContent = aluno.responsavel || "-";
    document.querySelector("#tb-contato").textContent = aluno.contato || "-";
    document.querySelector("#tb-status").textContent = aluno.status || "-";

    document.querySelector("#resumo-pais").textContent =
      aluno.observacoes?.trim()
        ? aluno.observacoes
        : `${aluno.nome || "O aluno"} está vinculado à turma ${aluno.turma || "-"} e à disciplina ${aluno.disciplina || "-"}.`;

    const botaoRelatorio = document.querySelector("#btn-ver-relatorio");
    if (botaoRelatorio) {
      botaoRelatorio.href = `relatorio.html?id=${aluno.id}`;
    }
  } catch (erro) {
    console.error("Erro ao carregar painel dos pais:", erro);
    alert("Erro ao carregar o painel dos pais.");
  }
}