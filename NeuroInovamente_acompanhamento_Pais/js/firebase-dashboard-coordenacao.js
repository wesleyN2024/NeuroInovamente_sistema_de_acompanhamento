// Importa a instância do banco de dados Firebase
import { db } from "./firebase-config.js";

// Importa funções para buscar dados no Firestore
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Executa quando a página carregar completamente
document.addEventListener("DOMContentLoaded", async () => {
  protegerPaginaCoordenacao(); // Garante que só coordenação acesse
  ajustarMenuPorPerfil(); // Ajusta visibilidade do menu
  await carregarDashboardCoordenacao(); // Carrega dados do painel
});

// Função para obter o usuário logado do localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

// Função que protege a página da coordenação
function protegerPaginaCoordenacao() {
  // Obtém o nome da página atual
  const paginaAtual = window.location.pathname.split("/").pop();

  // Só executa se estiver na página correta
  if (paginaAtual !== "dashboard-coordenacao.html") return;

  const usuario = obterUsuarioLogado();

  // Se não for coordenação, bloqueia acesso
  if (!usuario || usuario.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

// Ajusta o menu conforme o perfil do usuário
function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  // Seleciona os links do menu
  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksPais = document.querySelectorAll('a[href="painel-pais.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  // Se não for coordenação, esconde tudo
  if (usuario.perfil !== "Coordenação") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksPais.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

// Função principal que carrega o dashboard da coordenação
async function carregarDashboardCoordenacao() {
  // Seleciona elementos do HTML
  const totalAlunosEl = document.querySelector("#total-alunos");
  const totalProfessoresEl = document.querySelector("#total-professores");
  const totalTurmasEl = document.querySelector("#total-turmas");
  const totalAvaliacoesEl = document.querySelector("#total-avaliacoes");
  const listaTurmasEl = document.querySelector("#lista-turmas");
  const resumoCoordenacaoEl = document.querySelector("#resumo-coordenacao");

  // Se algum elemento não existir, interrompe execução
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
    // Busca dados das coleções
    const alunosSnapshot = await getDocs(collection(db, "alunos"));
    const usuariosSnapshot = await getDocs(collection(db, "usuarios"));

    // Converte snapshots em arrays
    const alunos = [];
    alunosSnapshot.forEach((docSnap) => {
      alunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    const usuarios = [];
    usuariosSnapshot.forEach((docSnap) => {
      usuarios.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Filtra usuários válidos (professores, coordenação e pais)
    const professores = usuarios.filter(
      (usuario) => usuario.perfil === "Professor" || usuario.perfil === "Coordenação" || usuario.perfil === "Pais"
    );

    // Atualiza totais no painel
    totalAlunosEl.textContent = alunos.length;
    totalProfessoresEl.textContent = professores.length;

    // Aqui está sendo usado alunos.length como base de relatórios
    totalAvaliacoesEl.textContent = alunos.length;

    // Objeto para organizar turmas
    const turmasMap = {};

    // Conta alunos por turma
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

    // Associa professores às turmas
    usuarios.forEach((usuario) => {
      if (usuario.perfil !== "Professor") return;

      let turmasProfessor = [];

      if (Array.isArray(usuario.turmas) && usuario.turmas.length > 0) {
        turmasProfessor = usuario.turmas;
      } else if (usuario.turma) {
        turmasProfessor = usuario.turma
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "");
      }

      turmasProfessor.forEach((turma) => {
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
    });

    // Converte objeto em array
    const turmas = Object.entries(turmasMap);

    // Atualiza total de turmas
    totalTurmasEl.textContent = turmas.length;

    // Limpa tabela
    listaTurmasEl.innerHTML = "";

    // Caso não haja turmas
    if (turmas.length === 0) {
      listaTurmasEl.innerHTML = `
        <tr>
          <td colspan="4">Nenhuma turma encontrada ainda.</td>
        </tr>
      `;
    } else {
      // Preenche tabela com dados das turmas
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

    // Monta texto resumo da coordenação
    let resumo = `Atualmente o sistema possui ${alunos.length} aluno(s), ${professores.length} usuário(s) autorizado(s) e ${turmas.length} turma(s) ativa(s).`;

    if (alunos.length > 0) {
      resumo += ` Os relatórios individuais estão disponíveis a partir dos cadastros dos alunos no sistema.`;
    }

    // Exibe resumo
    resumoCoordenacaoEl.textContent = resumo;
  } catch (erro) {
    // Trata erro e exibe mensagem
    console.error("Erro ao carregar dashboard da coordenação:", erro);
    resumoCoordenacaoEl.textContent =
      "Erro ao carregar os dados da coordenação.";
  }
}
