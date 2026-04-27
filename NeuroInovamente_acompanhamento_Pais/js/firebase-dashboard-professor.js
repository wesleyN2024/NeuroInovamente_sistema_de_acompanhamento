// Importa a instância do banco de dados Firebase
import { db } from "./firebase-config.js";

// Importa funções do Firestore para manipulação de dados
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Array que armazena os alunos da disciplina do professor
let alunosDaDisciplina = [];

// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", async () => {
  protegerPaginaProfessor(); // Protege a página
  ajustarMenuPorPerfil(); // Ajusta menu conforme perfil
  preencherDataAtual(); // Mostra data atual
  preencherDataPadraoFormularios(); // Define data padrão nos formulários
  await carregarDashboardProfessor(); // Carrega dados do painel
  await carregarAlunosDaDisciplina(); // Carrega alunos da disciplina
  configurarSalvarRelatorio(); // Configura salvar relatório
  configurarSalvarPresenca(); // Configura salvar presença
});

// Obtém o usuário logado do localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
  function obterTurmasDoProfessor(usuario) {
    if (Array.isArray(usuario.turmas) && usuario.turmas.length > 0) {
      return usuario.turmas;
    }

    if (usuario.turma) {
      return [usuario.turma];
    }

    return [];
  }
}
// Protege a página para que apenas professores acessem
function protegerPaginaProfessor() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "dashboard-professor.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Professor") {
    alert("Acesso restrito ao professor.");
    window.location.href = "login.html";
  }
}

// Ajusta o menu escondendo opções não permitidas
function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksPais = document.querySelectorAll('a[href="painel-pais.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  // Se for professor, esconde menus administrativos
  if (usuario.perfil === "Professor") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksPais.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

// Preenche a data atual no painel
function preencherDataAtual() {
  const campoData = document.querySelector("#data-atual-professor");
  if (!campoData) return;

  const hoje = new Date();
  campoData.textContent = hoje.toLocaleDateString("pt-BR");
}

// Define a data padrão nos formulários
function preencherDataPadraoFormularios() {
  const hoje = new Date().toISOString().split("T")[0];

  const dataRelatorio = document.querySelector("#data-aula-relatorio");
  const dataPresenca = document.querySelector("#data-presenca");

  if (dataRelatorio) dataRelatorio.value = hoje;
  if (dataPresenca) dataPresenca.value = hoje;
}

// Carrega informações do dashboard do professor
async function carregarDashboardProfessor() {
  const usuario = obterUsuarioLogado();

  const campoNome = document.querySelector("#nome-professor-painel");
  const campoDisciplina = document.querySelector("#disciplina-professor-painel");
  const campoTotal = document.querySelector("#total-alunos-professor");
  const textoDisciplina = document.querySelector("#texto-disciplina-professor");
  const resumoProfessor = document.querySelector("#resumo-professor");

  if (!usuario || usuario.perfil !== "Professor") return;

  // Preenche nome e disciplina
  if (campoNome) campoNome.textContent = usuario.nome || "Professor";
  if (campoDisciplina) campoDisciplina.textContent = usuario.disciplina || "Não definida";

  // Texto informativo sobre disciplina
  if (textoDisciplina) {
    textoDisciplina.textContent = usuario.disciplina
      ? `Você está vinculado à disciplina ${usuario.disciplina}.`
      : "Nenhuma disciplina foi vinculada ao seu cadastro ainda.";
  }

  try {
    // Busca alunos da mesma disciplina
    const turmasProfessor = obterTurmasDoProfessor(usuario);

    let q;

    if (turmasProfessor.length > 0) {
      q = query(
        collection(db, "alunos"),
        where("disciplina", "==", usuario.disciplina || ""),
        where("turma", "in", turmasProfessor)
      );
    } else {
      q = query(
        collection(db, "alunos"),
        where("disciplina", "==", usuario.disciplina || "")
      );
    }

    const snapshot = await getDocs(q);
    const totalAlunos = snapshot.size;

    // Exibe total de alunos
    if (campoTotal) campoTotal.textContent = totalAlunos;

    // Texto resumo do professor
    if (resumoProfessor) {
      resumoProfessor.textContent = usuario.disciplina
        ? `Você está vinculado à disciplina ${usuario.disciplina} e atualmente possui ${totalAlunos} aluno(s) relacionado(s) a essa disciplina no sistema.`
        : "Seu cadastro ainda não possui uma disciplina vinculada no sistema.";
    }
  } catch (erro) {
    console.error("Erro ao carregar dashboard do professor:", erro);

    if (campoTotal) campoTotal.textContent = "0";
    if (resumoProfessor) resumoProfessor.textContent = "Erro ao carregar os dados do professor.";
  }
}

// Carrega alunos vinculados à disciplina do professor
async function carregarAlunosDaDisciplina() {
  const usuario = obterUsuarioLogado();

  const tbody = document.querySelector("#lista-alunos-disciplina");
  const selectAluno = document.querySelector("#select-aluno-relatorio");
  const blocoPresenca = document.querySelector("#lista-presenca");

  if (!usuario || usuario.perfil !== "Professor") return;
  if (!tbody || !selectAluno || !blocoPresenca) return;

  // Limpa conteúdos anteriores
  tbody.innerHTML = "";
  selectAluno.innerHTML = `<option value="">Selecione o aluno</option>`;
  blocoPresenca.innerHTML = "";

  try {
    // Consulta alunos da disciplina
    const turmasProfessor = obterTurmasDoProfessor(usuario);

    let q;

    if (turmasProfessor.length > 0) {
      q = query(
        collection(db, "alunos"),
        where("disciplina", "==", usuario.disciplina || ""),
        where("turma", "in", turmasProfessor)
      );
    } else {
      q = query(
        collection(db, "alunos"),
        where("disciplina", "==", usuario.disciplina || "")
      );
    }

    const snapshot = await getDocs(q);

    alunosDaDisciplina = [];

    // Preenche lista de alunos
    snapshot.forEach((docSnap) => {
      alunosDaDisciplina.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Caso não haja alunos
    if (alunosDaDisciplina.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">Nenhum aluno encontrado para esta disciplina.</td>
        </tr>
      `;
      blocoPresenca.innerHTML = `<p>Nenhum aluno encontrado para marcar presença.</p>`;
      return;
    }

    // Preenche tabela e select
    alunosDaDisciplina.forEach((aluno) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${aluno.nome || "-"}</td>
        <td>${aluno.turma || "-"}</td>
        <td>${aluno.status || "-"}</td>
        <td>${aluno.responsavel || "-"}</td>
        <td>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn btn-secundario btn-abrir-relatorio-aluno" data-id="${aluno.id}">
              Registrar relatório
            </button>
            <a class="btn btn-secundario" href="relatorio.html?id=${aluno.id}">
              Ver cadastro
            </a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      const option = document.createElement("option");
      option.value = aluno.id;
      option.textContent = aluno.nome || "Aluno";
      selectAluno.appendChild(option);
    });

    // Monta lista de presença
    alunosDaDisciplina.forEach((aluno) => {
      const item = document.createElement("div");

      item.innerHTML = `
        <strong>${aluno.nome || "-"}</strong>
        <label>
          <input type="radio" name="presenca-${aluno.id}" value="Presente" checked />
          Presente
        </label>
        <label>
          <input type="radio" name="presenca-${aluno.id}" value="Faltou" />
          Faltou
        </label>
      `;

      blocoPresenca.appendChild(item);
    });

    // Botão para selecionar aluno no formulário
    document.querySelectorAll(".btn-abrir-relatorio-aluno").forEach((botao) => {
      botao.addEventListener("click", () => {
        const alunoId = botao.dataset.id;
        selectAluno.value = alunoId;
        selectAluno.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar alunos da disciplina:", erro);

    tbody.innerHTML = `
      <tr>
        <td colspan="5">Erro ao carregar alunos.</td>
      </tr>
    `;
    blocoPresenca.innerHTML = `<p>Erro ao carregar presença.</p>`;
  }
}

// Configura salvamento de relatório
function configurarSalvarRelatorio() {
  const botao = document.querySelector("#btn-salvar-relatorio");
  if (!botao) return;

  botao.addEventListener("click", async () => {
    const usuario = obterUsuarioLogado();

    // Captura dados do formulário
    const alunoId = document.querySelector("#select-aluno-relatorio")?.value || "";
    const dataAula = document.querySelector("#data-aula-relatorio")?.value || "";
    const nivelDesenvolvimento = Number(document.querySelector("#nivel-desenvolvimento-relatorio")?.value || 0);

    // NOVO: Captura avaliação neurocognitiva
    const coordenacao = document.querySelector("#avaliacao-coordenacao")?.value;
    const linguagem = document.querySelector("#avaliacao-linguagem")?.value;
    const emocional = document.querySelector("#avaliacao-emocional")?.value;
    const memoria = document.querySelector("#avaliacao-memoria")?.value;
    const integracao = document.querySelector("#avaliacao-integracao")?.value;

    const desenvolvimento = document.querySelector("#desenvolvimento-relatorio")?.value.trim() || "";
    const observacoes = document.querySelector("#obs-relatorio")?.value.trim() || "";
    const mensagem = document.querySelector("#mensagem-relatorio");

    if (!usuario || usuario.perfil !== "Professor") return;

    // Validação
    if (
      !alunoId ||
      !dataAula ||
      !desenvolvimento ||
      !nivelDesenvolvimento ||
      coordenacao === "" ||
      linguagem === "" ||
      emocional === "" ||
      memoria === "" ||
      integracao === ""
    ) {
      if (mensagem) {
        mensagem.textContent = "Preencha aluno, data, nível, avaliação neurocognitiva e desenvolvimento.";
      }
      return;
    }

    const aluno = alunosDaDisciplina.find((item) => item.id === alunoId);

    if (!aluno) {
      if (mensagem) mensagem.textContent = "Aluno não encontrado na sua disciplina.";
      return;
    }

    try {
      // Salva relatório no Firestore
      await addDoc(collection(db, "relatorios"), {
        alunoId: aluno.id,
        alunoNome: aluno.nome || "",
        turma: aluno.turma || "",
        disciplina: aluno.disciplina || "",
        responsavel: aluno.responsavel || "",
        responsavelEmail: aluno.responsavelEmail || "",
        professorEmail: (usuario.email || "").toLowerCase(),
        professorNome: usuario.nome || "",
        dataAula,
        nivelDesenvolvimento,

        // NOVO: Salva avaliação neurocognitiva dentro do relatório
        avaliacaoNeurocognitiva: {
          coordenacao: Number(coordenacao),
          linguagem: Number(linguagem),
          emocional: Number(emocional),
          memoria: Number(memoria),
          integracao: Number(integracao)
        },

        // NOVO: Média geral da avaliação neurocognitiva
        mediaNeurocognitiva:
          (
            Number(coordenacao) +
            Number(linguagem) +
            Number(emocional) +
            Number(memoria) +
            Number(integracao)
          ) / 5,

        desenvolvimento,
        observacoes,
        criadoEm: new Date().toISOString()
      });

      // Limpa formulário
      document.querySelector("#desenvolvimento-relatorio").value = "";
      document.querySelector("#obs-relatorio").value = "";
      document.querySelector("#nivel-desenvolvimento-relatorio").value = "";

      // NOVO: Limpa campos da avaliação neurocognitiva
      document.querySelector("#avaliacao-coordenacao").value = "";
      document.querySelector("#avaliacao-linguagem").value = "";
      document.querySelector("#avaliacao-emocional").value = "";
      document.querySelector("#avaliacao-memoria").value = "";
      document.querySelector("#avaliacao-integracao").value = "";

      if (mensagem) mensagem.textContent = "Relatório salvo com sucesso.";
    } catch (erro) {
      console.error("Erro ao salvar relatório:", erro);
      if (mensagem) mensagem.textContent = "Erro ao salvar relatório.";
    }
  });
}

// Configura salvamento de presença
function configurarSalvarPresenca() {
  const botao = document.querySelector("#btn-salvar-presenca");
  if (!botao) return;

  botao.addEventListener("click", async () => {
    const usuario = obterUsuarioLogado();
    const dataAula = document.querySelector("#data-presenca")?.value || "";
    const mensagem = document.querySelector("#mensagem-presenca");

    if (!usuario || usuario.perfil !== "Professor") return;

    if (!dataAula) {
      if (mensagem) mensagem.textContent = "Selecione a data da presença.";
      return;
    }

    if (alunosDaDisciplina.length === 0) {
      if (mensagem) mensagem.textContent = "Nenhum aluno disponível para presença.";
      return;
    }

    try {
      // Percorre todos os alunos para salvar presença
      for (const aluno of alunosDaDisciplina) {
        const radioSelecionado = document.querySelector(`input[name="presenca-${aluno.id}"]:checked`);
        const status = radioSelecionado ? radioSelecionado.value : "Presente";

        // Cria ID único para evitar duplicidade
        const docId = `${(usuario.email || "").toLowerCase()}_${dataAula}_${aluno.id}`;

        await setDoc(doc(db, "presencas", docId), {
          alunoId: aluno.id,
          alunoNome: aluno.nome || "",
          turma: aluno.turma || "",
          disciplina: aluno.disciplina || "",
          responsavelEmail: aluno.responsavelEmail || "",
          professorEmail: (usuario.email || "").toLowerCase(),
          professorNome: usuario.nome || "",
          dataAula,
          status,
          atualizadoEm: new Date().toISOString()
        });
      }

      if (mensagem) mensagem.textContent = "Presença salva com sucesso.";
    } catch (erro) {
      console.error("Erro ao salvar presença:", erro);
      if (mensagem) mensagem.textContent = "Erro ao salvar presença.";
    }
  });
}
