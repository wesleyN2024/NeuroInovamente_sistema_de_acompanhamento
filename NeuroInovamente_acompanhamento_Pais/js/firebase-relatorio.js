import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const btnPdf = document.querySelector(".btn-baixar-pdf");

if (btnPdf) {
  btnPdf.addEventListener("click", () => {
    window.print();
  });
}

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

async function buscarUsuarioPorEmail(email) {
  const q = query(collection(db, "usuarios"), where("email", "==", email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}

function preencherRelatorio(aluno) {
  document.querySelector("#relatorio-topo-aluno").textContent =
    `Aluno: ${aluno.nome} | Turma: ${aluno.turma} | Disciplina: ${aluno.disciplina || "-"}`;

  document.querySelector("#relatorio-nome").textContent = aluno.nome || "-";
  document.querySelector("#relatorio-turma").textContent = aluno.turma || "-";
  document.querySelector("#relatorio-disciplina").textContent = aluno.disciplina || "-";
  document.querySelector("#relatorio-status").textContent = aluno.status || "-";

  document.querySelector("#texto-linguistica").textContent =
    `O aluno ${aluno.nome || "selecionado"} está vinculado à disciplina ${aluno.disciplina || "não informada"} e apresenta acompanhamento registrado no sistema.`;

  document.querySelector("#texto-neurocognitivo").textContent =
    `Registro atual do aluno na turma ${aluno.turma || "não informada"}, com status ${aluno.status || "não informado"}.`;

  document.querySelector("#texto-psicomotora").textContent =
    aluno.observacoes?.trim()
      ? aluno.observacoes
      : "Ainda não há observações detalhadas registradas para este aluno.";

  document.querySelector("#texto-parecer").textContent =
    `Relatório individual gerado para ${aluno.nome || "o aluno"}, responsável: ${aluno.responsavel || "não informado"}.`;
}

async function carregarRelatorioAluno() {
  const usuario = obterUsuarioLogado();

  if (!usuario) {
    alert("Faça login para acessar o relatório.");
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const alunoId = params.get("id");

  if (!alunoId) {
    document.querySelector("#relatorio-topo-aluno").textContent =
      "Nenhum aluno foi selecionado para este relatório.";
    return;
  }

  try {
    const alunoRef = doc(db, "alunos", alunoId);
    const alunoSnap = await getDoc(alunoRef);

    if (!alunoSnap.exists()) {
      document.querySelector("#relatorio-topo-aluno").textContent =
        "Aluno não encontrado.";
      return;
    }

    const aluno = alunoSnap.data();

    // Coordenação e Professor podem visualizar
    if (usuario.perfil === "Coordenação" || usuario.perfil === "Professor") {
      preencherRelatorio(aluno);
      return;
    }

    // Pais só podem visualizar o próprio aluno
    if (usuario.perfil === "Pais") {
      const usuarioBanco = await buscarUsuarioPorEmail(usuario.email);

      if (!usuarioBanco) {
        alert("Cadastro do responsável não encontrado.");
        window.location.href = "login.html";
        return;
      }

      const nomeResponsavel = (usuarioBanco.nome || "").trim().toLowerCase();
      const nomeResponsavelAluno = (aluno.responsavel || "").trim().toLowerCase();

      if (!nomeResponsavel || nomeResponsavel !== nomeResponsavelAluno) {
        alert("Você não tem permissão para visualizar este relatório.");
        window.location.href = "painel-pais.html";
        return;
      }

      preencherRelatorio(aluno);
      return;
    }

    alert("Perfil sem permissão para acessar o relatório.");
    window.location.href = "login.html";
  } catch (erro) {
    console.error("Erro ao carregar relatório:", erro);
    document.querySelector("#relatorio-topo-aluno").textContent =
      "Erro ao carregar os dados do relatório.";
  }
}

carregarRelatorioAluno();