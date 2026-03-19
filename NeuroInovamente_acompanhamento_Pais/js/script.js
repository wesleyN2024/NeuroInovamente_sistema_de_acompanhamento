document.addEventListener("DOMContentLoaded", () => {
  configurarNotas();
  configurarFormularioProfessor();
  configurarLogin();
  configurarBotoesPDF();
  protegerPaginaProfessores();
  protegerPaginaAlunos();
  configurarCadastroAlunos();
  configurarCadastroProfessores();
  ajustarMenuPorPerfil();
  protegerPaginaCoordenacao();
  carregarDashboardCoordenacao();
  protegerPaginaPais();
  carregarTotalAlunosProfessor();
  carregarDisciplinaProfessorPainel();
});

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

function obterProfessores() {
  return JSON.parse(localStorage.getItem("neurotalk_professores")) || [];
}

function obterAlunos() {
  return JSON.parse(localStorage.getItem("neurotalk_alunos")) || [];
}

function configurarNotas() {
  const gruposDeNotas = document.querySelectorAll(".notas");

  gruposDeNotas.forEach((grupo) => {
    const botoes = grupo.querySelectorAll("button");

    botoes.forEach((botao) => {
      botao.addEventListener("click", () => {
        botoes.forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
      });
    });
  });
}

function configurarFormularioProfessor() {
  const botaoSalvar = document.querySelector(".btn-salvar-avaliacao");
  const botaoLimpar = document.querySelector(".btn-limpar-avaliacao");
  const textarea = document.querySelector("textarea");
  const campoTema = document.querySelector('input[placeholder*="Tema da aula"]');
  const campoEstimulo = document.querySelector('input[placeholder*="Tipo de estímulo"]');

  if (!botaoSalvar && !botaoLimpar) return;

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", () => {
      const aluno = document.querySelector(".aluno-topo h4")?.textContent || "Aluno";
      const notasSelecionadas = document.querySelectorAll(".notas .ativo");

      if (!campoTema?.value.trim()) {
        alert("Preencha o tema da aula antes de salvar.");
        return;
      }

      if (!campoEstimulo?.value.trim()) {
        alert("Preencha o tipo de estímulo antes de salvar.");
        return;
      }

      if (notasSelecionadas.length < 6) {
        alert("Selecione todas as notas antes de salvar.");
        return;
      }

      const dados = {
        aluno,
        tema: campoTema.value,
        estimulo: campoEstimulo.value,
        observacao: textarea?.value || "",
        dataSalvamento: new Date().toLocaleString("pt-BR"),
        notas: Array.from(notasSelecionadas).map((nota) => nota.textContent.trim())
      };

      localStorage.setItem("neurotalk_avaliacao_atual", JSON.stringify(dados));
      alert(`Avaliação de ${aluno} salva com sucesso no protótipo.`);
    });
  }

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", () => {
      if (campoTema) campoTema.value = "";
      if (campoEstimulo) campoEstimulo.value = "";
      if (textarea) textarea.value = "";

      const botoesAtivos = document.querySelectorAll(".notas button.ativo");
      botoesAtivos.forEach((botao) => botao.classList.remove("ativo"));

      alert("Campos limpos com sucesso.");
    });
  }
}

function configurarLogin() {
  const botaoEntrar = document.querySelector(".btn-entrar-sistema");
  const campoEmail = document.querySelector("#email");
  const campoSenha = document.querySelector("#senha");
  const campoPerfil = document.querySelector("#perfil");

  if (!botaoEntrar) return;

  botaoEntrar.addEventListener("click", () => {
    const email = campoEmail?.value.trim();
    const senha = campoSenha?.value.trim();
    const perfil = campoPerfil?.value;

    if (!email) {
      alert("Preencha o e-mail ou usuário.");
      campoEmail?.focus();
      return;
    }

    if (!senha) {
      alert("Preencha a senha.");
      campoSenha?.focus();
      return;
    }

    if (!perfil) {
      alert("Selecione o perfil.");
      campoPerfil?.focus();
      return;
    }

    const professores = obterProfessores();

    if (perfil === "Professor") {
      const professorEncontrado = professores.find(
        (professor) =>
          professor.email === email &&
          professor.senha === senha &&
          professor.perfil === "Professor"
      );

      if (!professorEncontrado) {
        alert("Professor não encontrado ou credenciais inválidas.");
        return;
      }

      const usuario = {
        email,
        perfil,
        disciplina: professorEncontrado.disciplina || "",
        nome: professorEncontrado.nome || ""
      };

      localStorage.setItem("neurotalk_usuario", JSON.stringify(usuario));
      window.location.href = "dashboard-professor.html";
      return;
    }

    if (perfil === "Coordenação") {
      const coordenacaoEncontrada = professores.find(
        (professor) =>
          professor.email === email &&
          professor.senha === senha &&
          professor.perfil === "Coordenação"
      );

      if (!coordenacaoEncontrada) {
        alert("Coordenação não encontrada ou credenciais inválidas.");
        return;
      }

      const usuario = {
        email,
        perfil,
        nome: coordenacaoEncontrada.nome || ""
      };

      localStorage.setItem("neurotalk_usuario", JSON.stringify(usuario));
      window.location.href = "dashboard-coordenacao.html";
      return;
    }

    if (perfil === "Pais") {
      const usuario = {
        email,
        perfil
      };

      localStorage.setItem("neurotalk_usuario", JSON.stringify(usuario));
      window.location.href = "painel-pais.html";
    }
  });
}

function configurarBotoesPDF() {
  const botoesPDF = document.querySelectorAll(".btn-baixar-pdf");

  botoesPDF.forEach((botao) => {
    botao.addEventListener("click", () => {
      window.print();
    });
  });
}

function protegerPaginaProfessores() {
  const estaNaPaginaProfessores = window.location.pathname.includes("professores.html");

  if (!estaNaPaginaProfessores) return;

  const usuarioSalvo = obterUsuarioLogado();

  if (!usuarioSalvo || usuarioSalvo.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

function configurarCadastroAlunos() {
  const botaoSalvar = document.querySelector("#btn-salvar-aluno");
  const botaoLimpar = document.querySelector("#btn-limpar-aluno");
  const lista = document.querySelector("#lista-alunos");

  if (!botaoSalvar || !lista) return;

  renderizarAlunos();

  botaoSalvar.addEventListener("click", () => {
    const nome = document.querySelector("#nome-aluno").value.trim();
    const turma = document.querySelector("#turma-aluno").value.trim();
    const disciplina = document.querySelector("#disciplina-aluno").value;
    const idade = document.querySelector("#idade-aluno").value.trim();
    const responsavel = document.querySelector("#responsavel-aluno").value.trim();
    const contato = document.querySelector("#contato-aluno").value.trim();
    const status = document.querySelector("#status-aluno").value;
    const observacoes = document.querySelector("#obs-aluno").value.trim();

    if (!nome || !turma || !disciplina || !idade || !responsavel) {
      alert("Preencha os campos principais do aluno.");
      return;
    }

    const alunos = obterAlunos();
    alunos.push({
      id: Date.now(),
      nome,
      turma,
      disciplina,
      idade,
      responsavel,
      contato,
      status,
      observacoes
    });

    localStorage.setItem("neurotalk_alunos", JSON.stringify(alunos));
    limparFormularioAluno();
    renderizarAlunos();
    carregarTotalAlunosProfessor();
    alert("Aluno cadastrado com sucesso.");
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFormularioAluno);
  }
}

function renderizarAlunos() {
  const lista = document.querySelector("#lista-alunos");
  if (!lista) return;

  const alunos = obterAlunos();
  lista.innerHTML = "";

  if (alunos.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="7">Nenhum aluno cadastrado ainda.</td>
      </tr>
    `;
    return;
  }

  alunos.forEach((aluno) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${aluno.nome}</td>
      <td>${aluno.turma}</td>
      <td>${aluno.disciplina || "-"}</td>
      <td>${aluno.idade}</td>
      <td>${aluno.responsavel}</td>
      <td>${aluno.status}</td>
      <td>
        <button class="btn-acao-excluir" onclick="excluirAluno(${aluno.id})">Excluir</button>
      </td>
    `;
    lista.appendChild(tr);
  });
}

function limparFormularioAluno() {
  const campos = [
    "#nome-aluno",
    "#turma-aluno",
    "#idade-aluno",
    "#responsavel-aluno",
    "#contato-aluno",
    "#obs-aluno"
  ];

  campos.forEach((seletor) => {
    const campo = document.querySelector(seletor);
    if (campo) campo.value = "";
  });

  const status = document.querySelector("#status-aluno");
  if (status) status.value = "Ativo";

  const disciplina = document.querySelector("#disciplina-aluno");
  if (disciplina) disciplina.value = "";
}

function excluirAluno(id) {
  const confirmar = confirm("Deseja realmente excluir este aluno?");
  if (!confirmar) return;

  const alunos = obterAlunos().filter((aluno) => aluno.id !== id);
  localStorage.setItem("neurotalk_alunos", JSON.stringify(alunos));
  renderizarAlunos();
  carregarTotalAlunosProfessor();
}

function configurarCadastroProfessores() {
  const botaoSalvar = document.querySelector("#btn-salvar-professor");
  const botaoLimpar = document.querySelector("#btn-limpar-professor");
  const lista = document.querySelector("#lista-professores");

  if (!botaoSalvar || !lista) return;

  renderizarProfessores();

  botaoSalvar.addEventListener("click", () => {
    const nome = document.querySelector("#nome-professor").value.trim();
    const funcao = document.querySelector("#funcao-professor").value.trim();
    const turma = document.querySelector("#turma-professor").value.trim();
    const disciplina = document.querySelector("#disciplina-professor").value;
    const email = document.querySelector("#email-professor").value.trim();
    const telefone = document.querySelector("#telefone-professor").value.trim();
    const senha = document.querySelector("#senha-professor").value.trim();
    const perfil = document.querySelector("#perfil-professor").value;
    const status = document.querySelector("#status-professor").value;

    if (!nome || !funcao || !email || !senha) {
      alert("Preencha os campos principais do professor.");
      return;
    }

    if (perfil === "Professor" && !disciplina) {
      alert("Selecione a disciplina do professor.");
      return;
    }

    const professores = obterProfessores();
    professores.push({
      id: Date.now(),
      nome,
      funcao,
      turma,
      disciplina: perfil === "Professor" ? disciplina : "",
      email,
      telefone,
      senha,
      perfil,
      status
    });

    localStorage.setItem("neurotalk_professores", JSON.stringify(professores));
    limparFormularioProfessorCadastro();
    renderizarProfessores();
    alert("Professor cadastrado com sucesso.");
  });

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFormularioProfessorCadastro);
  }
}

function renderizarProfessores() {
  const lista = document.querySelector("#lista-professores");
  if (!lista) return;

  const professores = obterProfessores();
  lista.innerHTML = "";

  if (professores.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="8">Nenhum professor cadastrado ainda.</td>
      </tr>
    `;
    return;
  }

  professores.forEach((professor) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${professor.nome}</td>
      <td>${professor.funcao}</td>
      <td>${professor.turma}</td>
      <td>${professor.disciplina || "-"}</td>
      <td>${professor.email}</td>
      <td>${professor.perfil}</td>
      <td>${professor.status}</td>
      <td>
        <button class="btn-acao-excluir" onclick="excluirProfessor(${professor.id})">Excluir</button>
      </td>
    `;
    lista.appendChild(tr);
  });
}

function limparFormularioProfessorCadastro() {
  const campos = [
    "#nome-professor",
    "#funcao-professor",
    "#turma-professor",
    "#email-professor",
    "#telefone-professor",
    "#senha-professor"
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

function excluirProfessor(id) {
  const confirmar = confirm("Deseja realmente excluir este professor?");
  if (!confirmar) return;

  const professores = obterProfessores().filter((professor) => professor.id !== id);
  localStorage.setItem("neurotalk_professores", JSON.stringify(professores));
  renderizarProfessores();
}

function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksPais = document.querySelectorAll('a[href="painel-pais.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  if (usuario.perfil === "Professor") {
    linksProfessores.forEach((link) => link.style.display = "none");
    linksCoordenacao.forEach((link) => link.style.display = "none");
    linksPais.forEach((link) => link.style.display = "none");
    linksAlunos.forEach((link) => link.style.display = "none");
  }

  if (usuario.perfil === "Pais") {
    linksProfessores.forEach((link) => link.style.display = "none");
    linksCoordenacao.forEach((link) => link.style.display = "none");
    linksAlunos.forEach((link) => link.style.display = "none");
  }

  if (usuario.perfil !== "Coordenação") {
    linksProfessores.forEach((link) => link.style.display = "none");
    linksCoordenacao.forEach((link) => link.style.display = "none");
    linksAlunos.forEach((link) => link.style.display = "none");
  }
}

function protegerPaginaCoordenacao() {
  const estaNaPaginaCoordenacao = window.location.pathname.includes("dashboard-coordenacao.html");

  if (!estaNaPaginaCoordenacao) return;

  const usuarioSalvo = obterUsuarioLogado();

  if (!usuarioSalvo || usuarioSalvo.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

function carregarDashboardCoordenacao() {
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

  const alunos = obterAlunos();
  const professores = obterProfessores();
  const avaliacaoAtual = JSON.parse(localStorage.getItem("neurotalk_avaliacao_atual"));

  totalAlunosEl.textContent = alunos.length;
  totalProfessoresEl.textContent = professores.length;
  totalAvaliacoesEl.textContent = avaliacaoAtual ? "1" : "0";

  const turmasMap = {};

  alunos.forEach((aluno) => {
    const turma = aluno.turma?.trim() || "Sem turma";
    if (!turmasMap[turma]) {
      turmasMap[turma] = {
        quantidadeAlunos: 0,
        professor: "Não definido",
        status: "Ativa"
      };
    }
    turmasMap[turma].quantidadeAlunos += 1;
  });

  professores.forEach((professor) => {
    const turma = professor.turma?.trim();
    if (turma) {
      if (!turmasMap[turma]) {
        turmasMap[turma] = {
          quantidadeAlunos: 0,
          professor: professor.nome,
          status: "Ativa"
        };
      } else {
        turmasMap[turma].professor = professor.nome;
      }
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

  let resumo = `Atualmente o sistema possui ${alunos.length} aluno(s), ${professores.length} professor(es) e ${turmas.length} turma(s) ativa(s).`;

  if (avaliacaoAtual) {
    resumo += ` A última avaliação registrada foi do aluno ${avaliacaoAtual.aluno}, com tema "${avaliacaoAtual.tema}".`;
  }

  resumoCoordenacaoEl.textContent = resumo;
}

function protegerPaginaPais() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "painel-pais.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Pais") {
    alert("Acesso restrito aos pais.");
    window.location.href = "login.html";
  }
}

function protegerPaginaAlunos() {
  const paginaAtual = window.location.pathname.split("/").pop();

  if (paginaAtual !== "alunos.html") return;

  const usuario = obterUsuarioLogado();

  if (!usuario || usuario.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

function carregarTotalAlunosProfessor() {
  const campoTotal = document.querySelector("#total-alunos-professor");
  if (!campoTotal) return;

  const usuario = obterUsuarioLogado();
  const alunos = obterAlunos();

  if (!usuario || usuario.perfil !== "Professor") {
    campoTotal.textContent = "0";
    return;
  }

  const disciplinaProfessor = usuario.disciplina || "";
  const alunosDaDisciplina = alunos.filter(
    (aluno) => aluno.disciplina === disciplinaProfessor
  );

  campoTotal.textContent = alunosDaDisciplina.length;
}

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