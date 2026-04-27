// Importa a instância do banco de dados Firebase
import { auth, db } from "./firebase-config.js";

// Importa função para esperar autenticação do Firebase
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// Importa funções do Firestore para leitura de dados
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Variáveis para armazenar os gráficos
let graficoPresencaPais = null;
let graficoDesenvolvimentoPais = null;

// Espera o Firebase reconhecer o usuário autenticado
function esperarAutenticacao() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", async () => {
  await protegerPaginaPais(); // Protege acesso à página
  ajustarMenuPorPerfil(); // Ajusta menu conforme perfil
  await esperarAutenticacao(); // Espera autenticação do Firebase
  await carregarPainelPais(); // Carrega dados do painel
});

// Função para obter usuário logado do localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

// Protege a página para que apenas pais possam acessar
async function protegerPaginaPais() {
  const paginaAtual = window.location.pathname.split("/").pop();

  // Se não estiver na página correta, não faz nada
  if (paginaAtual !== "painel-pais.html") return;

  const usuario = obterUsuarioLogado();

  // Bloqueia acesso se não for pai
  if (!usuario || usuario.perfil !== "Pais") {
    alert("Acesso restrito aos pais.");
    window.location.href = "login.html";
  }
}

// Ajusta o menu escondendo opções não permitidas
function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  // Se for pai, esconde áreas administrativas
  if (usuario.perfil === "Pais") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

// Busca usuário no banco pelo e-mail
async function buscarUsuarioPorEmail(email) {
  const emailNormalizado = email.trim().toLowerCase();

  const docRef = doc(db, "usuarios", emailNormalizado);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data()
  };
}

// Busca aluno vinculado ao responsável (pai)
async function buscarAlunoPorEmailResponsavel(emailResponsavel) {
  const emailNormalizado = emailResponsavel.trim().toLowerCase();

  const q = query(
    collection(db, "alunos"),
    where("responsavelId", "==", emailNormalizado)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  };
}


// Busca relatórios do aluno
async function buscarRelatoriosAluno(alunoId) {
  const q = query(
    collection(db, "relatorios"),
    where("alunoId", "==", alunoId)
  );

  const snapshot = await getDocs(q);

  const lista = [];

  snapshot.forEach((docSnap) => {
    lista.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  // Ordena por data (mais recente primeiro)
  lista.sort((a, b) => (b.dataAula || "").localeCompare(a.dataAula || ""));
  return lista;
}

// Busca presenças do aluno
async function buscarPresencasAluno(alunoId) {
  const q = query(
    collection(db, "presencas"),
    where("alunoId", "==", alunoId)
  );

  const snapshot = await getDocs(q);

  const lista = [];

  snapshot.forEach((docSnap) => {
    lista.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  // Ordena por data
  lista.sort((a, b) => (b.dataAula || "").localeCompare(a.dataAula || ""));
  return lista;
}

// Preenche tabela de relatórios
function preencherTabelaRelatorios(relatorios) {
  const tbody = document.querySelector("#lista-relatorios-pais");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Caso não haja dados
  if (!relatorios.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Nenhum relatório registrado ainda.</td>
      </tr>
    `;
    return;
  }

  // Preenche tabela com dados
  relatorios.forEach((relatorio) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${relatorio.dataAula || "-"}</td>
      <td>${relatorio.professorNome || "-"}</td>
      <td>${relatorio.nivelDesenvolvimento || "-"}</td>
      <td>${relatorio.desenvolvimento || "-"}</td>
      <td>${relatorio.observacoes || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Preenche tabela de presenças
function preencherTabelaPresencas(presencas) {
  const tbody = document.querySelector("#lista-presencas-pais");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Caso não haja dados
  if (!presencas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">Nenhum registro de presença ainda.</td>
      </tr>
    `;
    return;
  }

  // Preenche tabela
  presencas.forEach((presenca) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${presenca.dataAula || "-"}</td>
      <td>${presenca.professorNome || "-"}</td>
      <td>${presenca.status || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Renderiza gráfico de presença
function renderizarGraficoPresenca(presencas) {
  const canvas = document.querySelector("#grafico-presenca-pais");
  if (!canvas || !window.Chart) return;

  // Conta presenças e faltas
  const presentes = presencas.filter((item) => item.status === "Presente").length;
  const faltas = presencas.filter((item) => item.status === "Faltou").length;

  // Destroi gráfico anterior
  if (graficoPresencaPais) graficoPresencaPais.destroy();

  // Cria gráfico
  graficoPresencaPais = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Presente", "Faltou"],
      datasets: [{
        data: [presentes, faltas]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

// Renderiza gráfico de desenvolvimento
function renderizarGraficoDesenvolvimento(relatorios) {
  const canvas = document.querySelector("#grafico-desenvolvimento-pais");
  if (!canvas || !window.Chart) return;

  const relatoriosComNota = relatorios
    .filter((item) => Number(item.nivelDesenvolvimento) > 0)
    .sort((a, b) => (a.dataAula || "").localeCompare(b.dataAula || ""));

  if (graficoDesenvolvimentoPais) graficoDesenvolvimentoPais.destroy();

  graficoDesenvolvimentoPais = new Chart(canvas, {
    type: "line",
    data: {
      labels: relatoriosComNota.map((item) => item.dataAula || "-"),
      datasets: [{
        label: "Nível de desenvolvimento",
        data: relatoriosComNota.map((item) => Number(item.nivelDesenvolvimento))
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Função principal que carrega o painel dos pais
async function carregarPainelPais() {
  const usuario = obterUsuarioLogado();

  // Verifica se usuário é pai
  if (!usuario || usuario.perfil !== "Pais") return;

  // Garante que existe usuário autenticado no Firebase
  if (!auth.currentUser) {
    alert("Você precisa entrar novamente.");
    window.location.href = "login.html";
    return;
  }

  try {
    // Busca dados do responsável no banco
    const usuarioBanco = await buscarUsuarioPorEmail(usuario.email);

    if (!usuarioBanco) {
      alert("Cadastro do responsável não encontrado no sistema.");
      return;
    }

    // Verifica se está ativo
    if (usuarioBanco.status && usuarioBanco.status !== "Ativo") {
      alert("Seu acesso está inativo no sistema.");
      window.location.href = "login.html";
      return;
    }

    // Busca aluno vinculado ao responsável
    const aluno = await buscarAlunoPorEmailResponsavel(usuarioBanco.email);

    // Caso não tenha aluno vinculado
    if (!aluno) {
      const tituloFamilia = document.querySelector("#titulo-familia");
      const subtituloPainel = document.querySelector("#subtitulo-painel");
      const resumoPais = document.querySelector("#resumo-pais");

      if (tituloFamilia) {
        tituloFamilia.textContent = `Olá, ${usuarioBanco.nome || "família"}`;
      }

      if (subtituloPainel) {
        subtituloPainel.textContent = "Ainda não há aluno vinculado a este responsável.";
      }

      if (resumoPais) {
        resumoPais.textContent = "Nenhum aluno foi encontrado para este e-mail de responsável.";
      }

      preencherTabelaRelatorios([]);
      preencherTabelaPresencas([]);
      renderizarGraficoPresenca([]);
      renderizarGraficoDesenvolvimento([]);

      return;
    }

    // Preenche informações principais
    const tituloFamilia = document.querySelector("#titulo-familia");
    const subtituloPainel = document.querySelector("#subtitulo-painel");
    const cardAluno = document.querySelector("#card-aluno");
    const cardTurma = document.querySelector("#card-turma");
    const cardStatus = document.querySelector("#card-status");
    const tbNome = document.querySelector("#tb-nome");
    const tbTurma = document.querySelector("#tb-turma");
    const tbDisciplina = document.querySelector("#tb-disciplina");
    const tbResponsavel = document.querySelector("#tb-responsavel");
    const tbContato = document.querySelector("#tb-contato");
    const tbStatus = document.querySelector("#tb-status");
    const resumoPais = document.querySelector("#resumo-pais");

    if (tituloFamilia) {
      tituloFamilia.textContent = `Olá, ${usuarioBanco.nome || "família"}`;
    }

    if (subtituloPainel) {
      subtituloPainel.textContent = `Acompanhe abaixo o desenvolvimento de ${aluno.nome || "seu aluno"}.`;
    }

    if (cardAluno) {
      cardAluno.textContent = aluno.nome || "-";
    }

    if (cardTurma) {
      cardTurma.textContent = aluno.turma || "-";
    }

    if (cardStatus) {
      cardStatus.textContent = aluno.status || "-";
    }

    if (tbNome) {
      tbNome.textContent = aluno.nome || "-";
    }

    if (tbTurma) {
      tbTurma.textContent = aluno.turma || "-";
    }

    if (tbDisciplina) {
      tbDisciplina.textContent = aluno.disciplina || "-";
    }

    if (tbResponsavel) {
      tbResponsavel.textContent = aluno.responsavel || "-";
    }

    if (tbContato) {
      tbContato.textContent = aluno.contato || "-";
    }

    if (tbStatus) {
      tbStatus.textContent = aluno.status || "-";
    }

    // Texto automático do resumo
    if (resumoPais) {
      resumoPais.textContent =
        aluno.observacoes?.trim()
          ? aluno.observacoes
          : `${aluno.nome || "O aluno"} está vinculado à turma ${aluno.turma || "-"} e à disciplina ${aluno.disciplina || "-"}.`;
    }

    // Configura botão para abrir relatório completo
    const botaoRelatorio = document.querySelector("#btn-ver-relatorio");
    if (botaoRelatorio) {
      botaoRelatorio.href = `relatorio.html?id=${aluno.id}`;
    }

    // Busca dados adicionais
    const relatorios = await buscarRelatoriosAluno(aluno.id);
    const presencas = await buscarPresencasAluno(aluno.id);

    // Preenche interface
    preencherTabelaRelatorios(relatorios);
    preencherTabelaPresencas(presencas);
    renderizarGraficoPresenca(presencas);
    renderizarGraficoDesenvolvimento(relatorios);
  } catch (erro) {
    console.error("Erro ao carregar painel dos pais:", erro);
    console.error("Mensagem:", erro.message);
    console.error("Código:", erro.code);
    alert("Erro ao carregar o painel dos pais.");
  }
}
