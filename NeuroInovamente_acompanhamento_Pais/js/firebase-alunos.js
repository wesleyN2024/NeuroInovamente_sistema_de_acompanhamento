// Importa a instância do banco de dados Firebase
import { db } from "./firebase-config.js";

// Importa funções do Firestore para manipular documentos e coleções
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Executa as funções iniciais quando o DOM terminar de carregar
document.addEventListener("DOMContentLoaded", () => {
  protegerPaginaAlunos();
  ajustarMenuPorPerfil();
  configurarCadastroAlunosFirestore();
  carregarTotalAlunosProfessorFirestore();
  carregarDisciplinaProfessorPainel();
  configurarMascaraTelefoneAluno();
});

// Retorna o usuário logado salvo no localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

// Protege a página de alunos, permitindo acesso apenas para coordenação
function protegerPaginaAlunos() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "alunos.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

// Ajusta a visibilidade do menu conforme o perfil do usuário
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

// Limpa os campos do formulário de aluno
function limparFormularioAluno() {
  const ids = [
    "#nome-aluno",
    "#turma-aluno",
    "#idade-aluno",
    "#responsavel-aluno",
    "#email-responsavel-aluno",
    "#contato-aluno",
    "#obs-aluno"
  ];

  ids.forEach((id) => {
    const campo = document.querySelector(id);
    if (campo) campo.value = "";
  });

  const status = document.querySelector("#status-aluno");
  if (status) status.value = "Ativo";

  const disciplina = document.querySelector("#disciplina-aluno");
  if (disciplina) disciplina.value = "";
}

// Configura o cadastro de alunos usando Firestore
async function configurarCadastroAlunosFirestore() {
  const botaoSalvar = document.querySelector("#btn-salvar-aluno");
  const botaoLimpar = document.querySelector("#btn-limpar-aluno");
  const lista = document.querySelector("#lista-alunos");

  if (!botaoSalvar || !lista) return;

  await renderizarAlunosFirestore();

  botaoSalvar.addEventListener("click", async () => {
    const nome = document.querySelector("#nome-aluno").value.trim();
    const turma = document.querySelector("#turma-aluno").value.trim();
    const disciplina = document.querySelector("#disciplina-aluno").value;
    const idade = document.querySelector("#idade-aluno").value.trim();
    const responsavel = document.querySelector("#responsavel-aluno").value.trim();
    const responsavelEmail = document
      .querySelector("#email-responsavel-aluno")
      .value.trim()
      .toLowerCase();

    const contatoFormatado = document.querySelector("#contato-aluno").value.trim();
    const contato = contatoFormatado.replace(/\D/g, "");

    const status = document.querySelector("#status-aluno").value;
    const observacoes = document.querySelector("#obs-aluno").value.trim();

    if (!nome || !turma || !disciplina || !idade || !responsavel || !responsavelEmail) {
      alert("Preencha os campos principais do aluno.");
      return;
    }

    if (contato && contato.length < 10) {
      alert("Telefone do responsável inválido.");
      return;
    }

    try {
      await addDoc(collection(db, "alunos"), {
        nome,
        turma,
        disciplina,
        idade,
        responsavel,
        responsavelEmail,
        contato,
        status,
        observacoes,
        criadoEm: new Date().toISOString()
      });

      limparFormularioAluno();
      await renderizarAlunosFirestore();
      await carregarTotalAlunosProfessorFirestore();
      alert("Aluno cadastrado com sucesso.");
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar aluno no Firebase.");
    }
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFormularioAluno);
  }
}

// Renderiza a lista de alunos cadastrados na tabela
async function renderizarAlunosFirestore() {
  const lista = document.querySelector("#lista-alunos");
  if (!lista) return;

  lista.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "alunos"));

    if (snapshot.empty) {
      lista.innerHTML = `
        <tr>
          <td colspan="8">Nenhum aluno cadastrado ainda.</td>
        </tr>
      `;
      return;
    }

    snapshot.forEach((docSnap) => {
      const aluno = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${aluno.nome}</td>
        <td>${aluno.turma}</td>
        <td>${aluno.disciplina || "-"}</td>
        <td>${aluno.idade}</td>
        <td>${aluno.responsavel}</td>
        <td>${aluno.responsavelEmail || "-"}</td>
        <td>${aluno.status}</td>
        <td>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a class="btn btn-secundario btn-ver-relatorio" href="relatorio.html?id=${docSnap.id}">
              Ver relatório
            </a>
            <button class="btn-acao-excluir" data-id="${docSnap.id}">Excluir</button>
          </div>
        </td>
      `;

      lista.appendChild(tr);
    });

    lista.querySelectorAll(".btn-acao-excluir").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.id;
        const confirmar = confirm("Deseja realmente excluir este aluno?");
        if (!confirmar) return;

        try {
          await deleteDoc(doc(db, "alunos", id));
          await renderizarAlunosFirestore();
          await carregarTotalAlunosProfessorFirestore();
        } catch (erro) {
          console.error(erro);
          alert("Erro ao excluir aluno.");
        }
      });
    });
  } catch (erro) {
    console.error(erro);
    lista.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar alunos.</td>
      </tr>
    `;
  }
}

// Carrega a quantidade de alunos da disciplina do professor logado
async function carregarTotalAlunosProfessorFirestore() {
  const campoTotal = document.querySelector("#total-alunos-professor");
  if (!campoTotal) return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Professor") {
    campoTotal.textContent = "0";
    return;
  }

  try {
    const q = query(
      collection(db, "alunos"),
      where("disciplina", "==", usuario.disciplina || "")
    );

    const snapshot = await getDocs(q);
    campoTotal.textContent = snapshot.size;
  } catch (erro) {
    console.error(erro);
    campoTotal.textContent = "0";
  }
}

// Mostra a disciplina do professor no painel
function carregarDisciplinaProfessorPainel() {
  const campoDisciplina = document.querySelector("#disciplina-professor-painel");
  if (!campoDisciplina) return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Professor") {
    campoDisciplina.textContent = "Não definida";
    return;
  }

  campoDisciplina.textContent = usuario.disciplina || "Não definida";
}

// Aplica máscara de telefone no campo de contato do aluno
function configurarMascaraTelefoneAluno() {
  const campoTelefone = document.querySelector("#contato-aluno");

  if (!campoTelefone) return;

  campoTelefone.addEventListener("input", () => {
    let valor = campoTelefone.value;

    valor = valor.replace(/\D/g, "");
    valor = valor.substring(0, 11);

    if (valor.length > 10) {
      valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (valor.length > 6) {
      valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (valor.length > 0) {
      valor = valor.replace(/^(\d*)/, "($1");
    }

    campoTelefone.value = valor;
  });
}
