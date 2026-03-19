import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  protegerPaginaCoordenacao();
  ajustarMenuPorPerfil();
  await carregarDashboardCoordenacao();
});

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

function protegerPaginaCoordenacao() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "dashboard-coordenacao.html") return;

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

async function carregarDashboardCoordenacao() {
  const totalAlunosEl = document.querySelector("#total-alunos");
  const totalProfessoresEl = document.querySelector("#total-professores");
  const totalTurmasEl = document.querySelector("#total-turmas");
  const totalAvaliacoesEl = document.querySelector("#total-avaliacoes");
  const listaTurmasEl = document.querySelector("#lista-turmas");
  const resumoCoordenacaoEl = document.querySelector("#resumo-coordenacao");

  if (
    !totalAlunosEl ||
    !totalProfessoresEl ||
    !totalTurmasEl ||
    !totalAvaliacoesEl ||
    !listaTurmasEl ||
    !resumoCoordenacaoEl
  ) {
    return;
  }

  try {
    const alunosSnapshot = await getDocs(collection(db, "alunos"));
    const usuariosSnapshot = await getDocs(collection(db, "usuarios"));

    const alunos = [];
    alunosSnapshot.forEach((docSnap) => {
      alunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    const usuarios = [];
    usuariosSnapshot.forEach((docSnap) => {
      usuarios.push({ id: docSnap.id, ...docSnap.data() });
    });

    const professores = usuarios.filter(
      (usuario) => usuario.perfil === "Professor" || usuario.perfil === "Coordenação" || usuario.perfil === "Pais"
    );

    totalAlunosEl.textContent = alunos.length;
    totalProfessoresEl.textContent = professores.length;
    totalAvaliacoesEl.textContent = alunos.length;

    const turmasMap = {};

    alunos.forEach((aluno) => {
      const turma = (aluno.turma || "Sem turma").trim();

      if (!turmasMap[turma]) {
        turmasMap[turma] = {
          quantidadeAlunos: 0,
          professor: "Não definido",
          status: "Ativa"
        };
      }

      turmasMap[turma].quantidadeAlunos += 1;
    });

    usuarios.forEach((usuario) => {
      if (usuario.perfil !== "Professor") return;

      const turma = (usuario.turma || "").trim();
      if (!turma) return;

      if (!turmasMap[turma]) {
        turmasMap[turma] = {
          quantidadeAlunos: 0,
          professor: usuario.nome || "Não definido",
          status: "Ativa"
        };
      } else {
        turmasMap[turma].professor = usuario.nome || "Não definido";
      }
    });

    const turmas = Object.entries(turmasMap);
    totalTurmasEl.textContent = turmas.length;

    listaTurmasEl.innerHTML = "";

    if (turmas.length === 0) {
      listaTurmasEl.innerHTML = `
        <tr>
          <td colspan="4">Nenhuma turma encontrada ainda.</td>
        </tr>
      `;
    } else {
      turmas.forEach(([nomeTurma, dados]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${nomeTurma}</td>
          <td>${dados.quantidadeAlunos}</td>
          <td>${dados.professor}</td>
          <td>${dados.status}</td>
        `;
        listaTurmasEl.appendChild(tr);
      });
    }

    let resumo = `Atualmente o sistema possui ${alunos.length} aluno(s), ${professores.length} usuário(s) autorizado(s) e ${turmas.length} turma(s) ativa(s).`;

    if (alunos.length > 0) {
      resumo += ` Os relatórios individuais estão disponíveis a partir dos cadastros dos alunos no sistema.`;
    }

    resumoCoordenacaoEl.textContent = resumo;
  } catch (erro) {
    console.error("Erro ao carregar dashboard da coordenação:", erro);
    resumoCoordenacaoEl.textContent =
      "Erro ao carregar os dados da coordenação.";
  }
}