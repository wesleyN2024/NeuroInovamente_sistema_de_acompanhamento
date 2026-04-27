// Importa a instância do banco de dados Firebase
import { db } from "./firebase-config.js";

// Importa funções do Firestore para manipulação de dados
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", () => {
  protegerPaginaProfessores(); // Verifica se o usuário pode acessar a página
  ajustarMenuPorPerfil(); // Ajusta o menu conforme o perfil do usuário
  configurarCadastroProfessoresFirestore(); // Configura cadastro de usuários
  configurarMascaraTelefoneProfessor(); // Aplica máscara no campo de telefone
});

// Função para obter o usuário logado do localStorage
function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem("neurotalk_usuario")) || null;
}

// Função que protege a página de professores (apenas coordenação pode acessar)
function protegerPaginaProfessores() {
  const paginaAtual = window.location.pathname.split("/").pop();

  // Se não estiver na página correta, não faz nada
  if (paginaAtual !== "professores.html") return;

  const usuario = obterUsuarioLogado();

  // Se não estiver logado ou não for coordenação, bloqueia acesso
  if (!usuario || usuario.perfil !== "Coordenação") {
    alert("Acesso restrito à coordenação.");
    window.location.href = "login.html";
  }
}

// Ajusta os links do menu conforme o perfil do usuário
function ajustarMenuPorPerfil() {
  const usuario = obterUsuarioLogado();
  if (!usuario) return;

  // Seleciona links do menu
  const linksProfessores = document.querySelectorAll('a[href="professores.html"]');
  const linksCoordenacao = document.querySelectorAll('a[href="dashboard-coordenacao.html"]');
  const linksPais = document.querySelectorAll('a[href="painel-pais.html"]');
  const linksAlunos = document.querySelectorAll('a[href="alunos.html"]');

  // Se não for coordenação, oculta os links
  if (usuario.perfil !== "Coordenação") {
    linksProfessores.forEach((link) => (link.style.display = "none"));
    linksCoordenacao.forEach((link) => (link.style.display = "none"));
    linksPais.forEach((link) => (link.style.display = "none"));
    linksAlunos.forEach((link) => (link.style.display = "none"));
  }
}

// Limpa os campos do formulário de cadastro
function limparFormularioProfessorCadastro() {
  const campos = [
    "#nome-professor",
    "#funcao-professor",
    "#turma-professor",
    "#email-professor",
    "#telefone-professor"
  ];

  // Limpa inputs principais
  campos.forEach((seletor) => {
    const campo = document.querySelector(seletor);
    if (campo) campo.value = "";
  });

  // Reseta selects
  const perfil = document.querySelector("#perfil-professor");
  const status = document.querySelector("#status-professor");
  const disciplina = document.querySelector("#disciplina-professor");

  if (perfil) perfil.value = "Professor";
  if (status) status.value = "Ativo";
  if (disciplina) disciplina.value = "";
}

// Configura o cadastro de professores no Firestore
async function configurarCadastroProfessoresFirestore() {
  const botaoSalvar = document.querySelector("#btn-salvar-professor");
  const botaoLimpar = document.querySelector("#btn-limpar-professor");
  const lista = document.querySelector("#lista-professores");

  // Se elementos não existirem, interrompe execução
  if (!botaoSalvar || !lista) return;

  // Carrega lista inicial de usuários
  await renderizarProfessoresFirestore();

  // Evento de clique no botão salvar
  botaoSalvar.addEventListener("click", async () => {
    // Captura valores dos campos
    const nome = document.querySelector("#nome-professor").value.trim();
    const funcao = document.querySelector("#funcao-professor").value.trim();
    const turma = document.querySelector("#turma-professor").value.trim();
    const turmas = turma.split(",").map((item) => item.trim()).filter((item) => item !== "");
    const disciplina = document.querySelector("#disciplina-professor").value;
    const email = document.querySelector("#email-professor").value.trim().toLowerCase();
    const telefoneFormatado = document.querySelector("#telefone-professor").value.trim();
    const telefone = telefoneFormatado.replace(/\D/g, ""); // remove máscara
    const perfil = document.querySelector("#perfil-professor").value;
    const status = document.querySelector("#status-professor").value;

    // Validação básica
    if (!nome || !funcao || !email) {
      alert("Preencha os campos principais do usuário.");
      return;
    }

    // Validação específica para professor
    if (perfil === "Professor" && !disciplina) {
      alert("Selecione a disciplina do professor.");
      return;
    }

    // Validação do telefone
    if (telefone && telefone.length < 10) {
      alert("Telefone inválido.");
      return;
    }

    try {
      const emailNormalizado = email.trim().toLowerCase();

      // Verifica se já existe usuário com o mesmo e-mail
      const emailJaExiste = await getDocs(
        query(collection(db, "usuarios"), where("email", "==", emailNormalizado))
      );

      if (!emailJaExiste.empty) {
        alert("Já existe um usuário autorizado com esse e-mail.");
        return;
      }

      // Salva usuário no Firestore usando o e-mail como ID
      await setDoc(doc(db, "usuarios", emailNormalizado), {
        nome,
        funcao,
        turma: perfil === "Pais" ? "" : turma,
        turmas: perfil === "Professor" ? turmas : [],
        disciplina: perfil === "Professor" ? disciplina : "",
        email: emailNormalizado,
        telefone,
        perfil,
        status,
        criadoEm: new Date().toISOString()
      });

      // Limpa formulário e atualiza lista
      limparFormularioProfessorCadastro();
      await renderizarProfessoresFirestore();

      alert("Usuário autorizado com sucesso.");
    } catch (erro) {
      console.error("Erro ao cadastrar usuário:", erro);
      alert("Erro ao salvar usuário autorizado no Firebase.");
    }
  });

  // Evento do botão limpar
  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFormularioProfessorCadastro);
  }
}


// Renderiza a lista de usuários autorizados separada por perfil
async function renderizarProfessoresFirestore() {
  const lista = document.querySelector("#lista-professores");
  if (!lista) return;

  lista.innerHTML = "";

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));

    if (snapshot.empty) {
      lista.innerHTML = `
        <tr>
          <td colspan="8">Nenhum usuário autorizado ainda.</td>
        </tr>
      `;
      return;
    }

    const grupos = {
      Professor: [],
      "Coordenação": [],
      Pais: []
    };

    snapshot.forEach((docSnap) => {
      const usuario = {
        id: docSnap.id,
        ...docSnap.data()
      };

      if (grupos[usuario.perfil]) {
        grupos[usuario.perfil].push(usuario);
      }
    });
    // 🔥 Ordena alfabeticamente por nome
    Object.keys(grupos).forEach((perfil) => {
      grupos[perfil].sort((a, b) => {
        return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
      });
    });

    const renderizarTituloGrupo = (titulo) => {
      lista.innerHTML += `
        <tr class="linha-grupo">
          <td colspan="8">${titulo}</td>
        </tr>
      `;
    };

    const renderizarUsuario = (usuario) => {
      lista.innerHTML += `
        <tr>
          <td>${usuario.nome || "-"}</td>
          <td>${usuario.funcao || "-"}</td>
          <td>${usuario.turma || "-"}</td>
          <td>${usuario.disciplina || "-"}</td>
          <td>${usuario.email || "-"}</td>
          <td>${usuario.perfil || "-"}</td>
          <td>${usuario.status || "-"}</td>
          <td>
            <button class="btn-acao-excluir" data-id="${usuario.id}">Excluir</button>
          </td>
        </tr>
      `;
    };

    if (grupos.Professor.length) {
      renderizarTituloGrupo("Professores");
      grupos.Professor.forEach(renderizarUsuario);
    }

    if (grupos["Coordenação"].length) {
      renderizarTituloGrupo("Coordenação");
      grupos["Coordenação"].forEach(renderizarUsuario);
    }

    if (grupos.Pais.length) {
      renderizarTituloGrupo("Pais / Responsáveis");
      grupos.Pais.forEach(renderizarUsuario);
    }

    if (!grupos.Professor.length && !grupos["Coordenação"].length && !grupos.Pais.length) {
      lista.innerHTML = `
        <tr>
          <td colspan="8">Nenhum usuário autorizado ainda.</td>
        </tr>
      `;
      return;
    }

    lista.querySelectorAll(".btn-acao-excluir").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const id = botao.dataset.id;
        const confirmar = confirm("Deseja realmente excluir este usuário autorizado?");
        if (!confirmar) return;

        try {
          await deleteDoc(doc(db, "usuarios", id));
          await renderizarProfessoresFirestore();
          alert("Usuário removido da lista do sistema.");
        } catch (erro) {
          console.error("Erro ao excluir usuário:", erro);
          alert("Erro ao excluir usuário.");
        }
      });
    });
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);

    lista.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar usuários autorizados.</td>
      </tr>
    `;
  }
}

// Aplica máscara de telefone (formato brasileiro)
function configurarMascaraTelefoneProfessor() {
  const campoTelefone = document.querySelector("#telefone-professor");

  if (campoTelefone) {
    campoTelefone.addEventListener("input", () => {
      let valor = campoTelefone.value;

      // Remove tudo que não for número
      valor = valor.replace(/\D/g, "");

      // Limita a 11 dígitos (celular brasileiro)
      valor = valor.substring(0, 11);

      // Aplica formatação dinâmica
      if (valor.length > 6) {
        valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
      } else if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
      } else {
        valor = valor.replace(/^(\d*)/, "($1");
      }

      campoTelefone.value = valor;
    });
  }
}
