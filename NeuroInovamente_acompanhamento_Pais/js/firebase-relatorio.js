// Importa a instância do banco de dados Firebase
import { db } from "./firebase-config.js";

console.log("ARQUIVO NOVO DO RELATORIO CARREGADO");

// Importa funções necessárias do Firestore
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Seleciona o botão de gerar PDF
const btnPdf = document.querySelector(".btn-baixar-pdf");

// Variáveis para armazenar os gráficos e permitir atualização
let graficoPresencaRelatorio = null;
let graficoDesenvolvimentoRelatorio = null;
let graficoAreasNeurocognitivas = null;

// Função para obter o usuário logado salvo no localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

// Função para buscar usuário no banco pelo e-mail
async function buscarUsuarioPorEmail(email) {
  const emailNormalizado = email.trim().toLowerCase();

  const usuarioRef = doc(db, "usuarios", emailNormalizado);
  const usuarioSnap = await getDoc(usuarioRef);

  if (!usuarioSnap.exists()) return null;

  return {
    id: usuarioSnap.id,
    ...usuarioSnap.data()
  };
}

// Mostra ou esconde as áreas do relatório
function alternarExibicaoConteudoRelatorio(mostrar) {
  const elementos = [
    ".relatorio-grid",
    ".tabela-box",
    ".rodape-relatorio",
    ".btn-baixar-pdf",
    "#grafico-desenvolvimento-relatorio"
  ];

  elementos.forEach((seletor) => {
    document.querySelectorAll(seletor).forEach((elemento) => {
      if (elemento) {
        elemento.style.display = mostrar ? "" : "none";
      }
    });
  });

  const blocosMargemTopo = document.querySelectorAll(".card-relatorio.margem-topo");
  blocosMargemTopo.forEach((bloco) => {
    if (bloco.id !== "bloco-selecao-relatorio") {
      bloco.style.display = mostrar ? "" : "none";
    }
  });
}

// Carrega a lista de alunos para seleção
async function carregarSelecaoDeAluno(usuario) {
  const blocoSelecao = document.querySelector("#bloco-selecao-relatorio");
  const textoSelecao = document.querySelector("#texto-selecao-relatorio");
  const selectAluno = document.querySelector("#select-aluno-relatorio-pagina");
  const botaoAbrir = document.querySelector("#btn-abrir-relatorio-selecionado");
  const topoAluno = document.querySelector("#relatorio-topo-aluno");

  if (!blocoSelecao || !selectAluno || !botaoAbrir) return;

  blocoSelecao.style.display = "block";
  alternarExibicaoConteudoRelatorio(false);

  if (topoAluno) {
    topoAluno.textContent = "Selecione um aluno para visualizar o relatório.";
  }

  selectAluno.innerHTML = `<option value="">Selecione o aluno</option>`;

  try {
    let alunos = [];

    if (usuario.perfil === "Coordenação") {
      const snapshot = await getDocs(collection(db, "alunos"));

      snapshot.forEach((docSnap) => {
        alunos.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      alunos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

      if (textoSelecao) {
        textoSelecao.textContent = "Escolha qualquer aluno cadastrado para abrir o relatório.";
      }
    }

    if (usuario.perfil === "Professor") {
      const q = query(
        collection(db, "alunos"),
        where("disciplina", "==", usuario.disciplina || "")
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        alunos.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      alunos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

      if (textoSelecao) {
        textoSelecao.textContent = "Escolha um aluno da sua disciplina para abrir o relatório.";
      }
    }

    if (!alunos.length) {
      selectAluno.innerHTML = `<option value="">Nenhum aluno disponível</option>`;
      return;
    }

    alunos.forEach((aluno) => {
      const option = document.createElement("option");
      option.value = aluno.id;
      option.textContent = `${aluno.nome || "Aluno"} - ${aluno.turma || "Sem turma"}`;
      selectAluno.appendChild(option);
    });

    botaoAbrir.addEventListener("click", () => {
      const alunoIdSelecionado = selectAluno.value;

      if (!alunoIdSelecionado) {
        alert("Selecione um aluno.");
        return;
      }

      window.location.href = `relatorio.html?id=${alunoIdSelecionado}`;
    });
  } catch (erro) {
    console.error("Erro ao carregar seleção de alunos:", erro);

    if (textoSelecao) {
      textoSelecao.textContent = "Erro ao carregar os alunos para seleção.";
    }
  }
}

// Preenche os dados do relatório na tela
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

// Renderiza gráfico de presença
function renderizarGraficoPresenca(presencas) {
  const canvas = document.querySelector("#grafico-presenca-relatorio");
  if (!canvas || !window.Chart) return;

  const presentes = presencas.filter((item) => item.status === "Presente").length;
  const faltas = presencas.filter((item) => item.status === "Faltou").length;

  if (graficoPresencaRelatorio) graficoPresencaRelatorio.destroy();

  graficoPresencaRelatorio = new Chart(canvas, {
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

// Renderiza gráfico de evolução do desenvolvimento
function renderizarGraficoDesenvolvimento(relatorios) {
  const canvas = document.querySelector("#grafico-desenvolvimento-relatorio");
  if (!canvas || !window.Chart) return;

  const relatoriosComNota = relatorios
    .filter((item) => Number(item.nivelDesenvolvimento) > 0)
    .sort((a, b) => (a.dataAula || "").localeCompare(b.dataAula || ""));

  if (graficoDesenvolvimentoRelatorio) graficoDesenvolvimentoRelatorio.destroy();

  graficoDesenvolvimentoRelatorio = new Chart(canvas, {
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

// Renderiza gráfico das áreas neurocognitivas avaliadas
function renderizarGraficoAreasNeurocognitivas(relatorios) {
  const canvas = document.querySelector("#grafico-areas-neurocognitivas");
  if (!canvas || !window.Chart) return;

  const relatoriosComAvaliacao = relatorios.filter((item) => item.avaliacaoNeurocognitiva);

  if (!relatoriosComAvaliacao.length) {
    return;
  }

  let soma = {
    coordenacao: 0,
    linguagem: 0,
    emocional: 0,
    memoria: 0,
    integracao: 0
  };

  relatoriosComAvaliacao.forEach((item) => {
    soma.coordenacao += Number(item.avaliacaoNeurocognitiva.coordenacao || 0);
    soma.linguagem += Number(item.avaliacaoNeurocognitiva.linguagem || 0);
    soma.emocional += Number(item.avaliacaoNeurocognitiva.emocional || 0);
    soma.memoria += Number(item.avaliacaoNeurocognitiva.memoria || 0);
    soma.integracao += Number(item.avaliacaoNeurocognitiva.integracao || 0);
  });

  const total = relatoriosComAvaliacao.length;

  const dados = [
    soma.coordenacao / total,
    soma.linguagem / total,
    soma.emocional / total,
    soma.memoria / total,
    soma.integracao / total
  ];

  if (graficoAreasNeurocognitivas) {
    graficoAreasNeurocognitivas.destroy();
  }

  graficoAreasNeurocognitivas = new Chart(canvas, {
    type: "bar",
    data: {
      labels: [
        "Coordenação",
        "Linguagem",
        "Emocional",
        "Memória",
        "Integração"
      ],
      datasets: [{
        label: "Média das avaliações",
        data: dados,
        backgroundColor: "rgba(147, 190, 232, 0.9)",
        borderRadius: 4,
        barThickness: 48
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom"
        },
        title: {
          display: true,
          text: "Áreas Neurocognitivas Avaliadas",
          font: {
            size: 20,
            weight: "bold"
          },
          color: "#666"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 2,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: "#e5e5e5"
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Carrega histórico de relatórios do aluno
async function carregarHistoricoRelatorios(alunoId) {
  const tbody = document.querySelector("#lista-historico-relatorios");
  if (!tbody) return [];

  try {
    const q = query(collection(db, "relatorios"), where("alunoId", "==", alunoId));
    const snapshot = await getDocs(q);

    const lista = [];

    snapshot.forEach((docSnap) => {
      lista.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    lista.sort((a, b) => (b.dataAula || "").localeCompare(a.dataAula || ""));
    tbody.innerHTML = "";

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">Nenhum relatório registrado ainda.</td>
        </tr>
      `;
      return [];
    }

    lista.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.dataAula || "-"}</td>
        <td>${item.professorNome || "-"}</td>
        <td>${item.nivelDesenvolvimento || "-"}</td>
        <td>${item.desenvolvimento || "-"}</td>
        <td>${item.observacoes || "-"}</td>
      `;
      tbody.appendChild(tr);
    });

    return lista;
  } catch (erro) {
    console.error("Erro ao carregar histórico de relatórios:", erro);

    tbody.innerHTML = `
      <tr>
        <td colspan="5">Erro ao carregar histórico.</td>
      </tr>
    `;
    return [];
  }
}

// Carrega histórico de presença do aluno
async function carregarHistoricoPresencas(alunoId) {
  const tbody = document.querySelector("#lista-historico-presencas");
  if (!tbody) return [];

  try {
    const q = query(collection(db, "presencas"), where("alunoId", "==", alunoId));
    const snapshot = await getDocs(q);

    const lista = [];

    snapshot.forEach((docSnap) => {
      lista.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    lista.sort((a, b) => (b.dataAula || "").localeCompare(a.dataAula || ""));
    tbody.innerHTML = "";

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">Nenhum registro de presença ainda.</td>
        </tr>
      `;
      return [];
    }

    lista.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.dataAula || "-"}</td>
        <td>${item.professorNome || "-"}</td>
        <td>${item.status || "-"}</td>
      `;
      tbody.appendChild(tr);
    });

    return lista;
  } catch (erro) {
    console.error("Erro ao carregar histórico de presença:", erro);

    tbody.innerHTML = `
      <tr>
        <td colspan="3">Erro ao carregar presença.</td>
      </tr>
    `;
    return [];
  }
}

// Função para gerar PDF do relatório
async function gerarPdfReal() {
  const areaRelatorio = document.querySelector(".relatorio");

  if (!areaRelatorio || !window.jspdf || !window.html2canvas) {
    alert("Bibliotecas de PDF não carregadas.");
    return;
  }

  const nomeAluno = document.querySelector("#relatorio-nome")?.textContent?.trim() || "aluno";

  btnPdf.disabled = true;
  btnPdf.textContent = "Gerando PDF...";

  try {
    const canvas = await window.html2canvas(areaRelatorio, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const usableWidth = pdfWidth - margin * 2;
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

    pdf.save(`relatorio-${nomeAluno}.pdf`);
  } catch (erro) {
    console.error("Erro ao gerar PDF:", erro);
    alert("Não foi possível gerar o PDF.");
  } finally {
    btnPdf.disabled = false;
    btnPdf.textContent = "Baixar PDF";
  }
}

// Função principal para carregar o relatório
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
    if (usuario.perfil === "Coordenação" || usuario.perfil === "Professor") {
      await carregarSelecaoDeAluno(usuario);
      return;
    }

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

    if (usuario.perfil === "Coordenação" || usuario.perfil === "Professor") {
      const blocoSelecao = document.querySelector("#bloco-selecao-relatorio");
      if (blocoSelecao) blocoSelecao.style.display = "none";

      alternarExibicaoConteudoRelatorio(true);
      preencherRelatorio(aluno);

      const relatorios = await carregarHistoricoRelatorios(alunoId);
      const presencas = await carregarHistoricoPresencas(alunoId);

      renderizarGraficoPresenca(presencas);
      renderizarGraficoDesenvolvimento(relatorios);
      renderizarGraficoAreasNeurocognitivas(relatorios);

      return;
    }

    if (usuario.perfil === "Pais") {
      const usuarioBanco = await buscarUsuarioPorEmail(usuario.email);

      if (!usuarioBanco) {
        alert("Cadastro do responsável não encontrado.");
        window.location.href = "login.html";
        return;
      }

      if (usuarioBanco.status && usuarioBanco.status !== "Ativo") {
        alert("Seu acesso está inativo no sistema.");
        window.location.href = "login.html";
        return;
      }

      const emailUsuario = (usuario.email || "").trim().toLowerCase();
      const emailResponsavelAluno = (aluno.responsavelEmail || "").trim().toLowerCase();

      if (!emailUsuario || !emailResponsavelAluno || emailUsuario !== emailResponsavelAluno) {
        alert("Você não tem permissão para visualizar este relatório.");
        window.location.href = "painel-pais.html";
        return;
      }

      const blocoSelecao = document.querySelector("#bloco-selecao-relatorio");
      if (blocoSelecao) blocoSelecao.style.display = "none";

      alternarExibicaoConteudoRelatorio(true);
      preencherRelatorio(aluno);

      const relatorios = await carregarHistoricoRelatorios(alunoId);
      const presencas = await carregarHistoricoPresencas(alunoId);

      renderizarGraficoPresenca(presencas);
      renderizarGraficoDesenvolvimento(relatorios);
      renderizarGraficoAreasNeurocognitivas(relatorios);

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

if (btnPdf) {
  btnPdf.addEventListener("click", gerarPdfReal);
}

carregarRelatorioAluno();
