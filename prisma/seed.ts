import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REPORT_COUNT = 24;
const SEED_CODE_PREFIX = "QA-SEED-";
const NOT_EXECUTED = "N\u00e3o Executado";

const systems = ["SNDesk", "Portal Cliente", "Backoffice", "Financeiro"];
const branches = ["master", "alfa", "beta", "release/2026.06"];
const testTypes = ["Reteste", "Regress\u00e3o", "Funcional", "Explorat\u00f3rio"];
const technicians = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha"];

const scenarios = [
  {
    screenPath: "Menu Rapido > Configuracoes > Minha Empresa",
    functionality: "Horario de funcionamento da empresa",
    bugDescription:
      "Validar se os horarios preenchidos permanecem nos dias corretos apos salvar.",
  },
  {
    screenPath: "Chamados > Atendimento > Detalhes",
    functionality: "Historico de interacoes do chamado",
    bugDescription:
      "Conferir se a interacao mais recente aparece no topo com data e usuario corretos.",
  },
  {
    screenPath: "Financeiro > Titulos > Baixa manual",
    functionality: "Baixa manual de titulo",
    bugDescription:
      "Confirmar se a baixa atualiza o status do titulo e registra auditoria.",
  },
  {
    screenPath: "Relatorios > Qualidade > Exportacao",
    functionality: "Exportacao de relatorio em XLSX",
    bugDescription:
      "Validar se a planilha exportada mantem filtros, colunas e status exibidos na tela.",
  },
  {
    screenPath: "Usuarios > Permissoes > Perfil",
    functionality: "Alteracao de perfil do usuario",
    bugDescription:
      "Garantir que a troca de perfil atualiza permissoes sem exigir novo cadastro.",
  },
  {
    screenPath: "Dashboard > Indicadores > Cards",
    functionality: "Indicadores de testes recentes",
    bugDescription:
      "Verificar se os cards exibem totais coerentes com os filtros aplicados.",
  },
];

const statusByIndex = (index: number) => {
  if (index % 6 === 0) return NOT_EXECUTED;
  if (index % 4 === 0) return "Reprovado QA";
  return "Aprovado QA";
};

const stepsForStatus = (status: string) => {
  if (status === "Reprovado QA") {
    return [
      {
        stepNumber: 1,
        action: "Acessar a tela indicada no relatorio",
        expectedResult: "A tela deve ser carregada sem erros",
        actualResult: "A tela foi carregada corretamente",
        status: "Aprovado QA",
      },
      {
        stepNumber: 2,
        action: "Executar o fluxo principal informado no chamado",
        expectedResult: "O fluxo deve ser concluido com sucesso",
        actualResult: "O comportamento incorreto foi reproduzido durante o fluxo",
        status: "Reprovado QA",
      },
      {
        stepNumber: 3,
        action: "Validar os impactos apos a falha",
        expectedResult: "Nao deve haver efeitos colaterais",
        actualResult: "Pendente de execucao",
        status: NOT_EXECUTED,
      },
    ];
  }

  if (status === NOT_EXECUTED) {
    return [
      {
        stepNumber: 1,
        action: "Preparar ambiente e massa de dados",
        expectedResult: "Ambiente deve estar pronto para execucao",
        actualResult: "Pendente de execucao",
        status: NOT_EXECUTED,
      },
      {
        stepNumber: 2,
        action: "Executar o fluxo principal do teste",
        expectedResult: "Fluxo deve ser validado conforme especificacao",
        actualResult: "Pendente de execucao",
        status: NOT_EXECUTED,
      },
    ];
  }

  return [
    {
      stepNumber: 1,
      action: "Acessar a funcionalidade",
      expectedResult: "Funcionalidade deve abrir corretamente",
      actualResult: "Funcionalidade aberta corretamente",
      status: "Aprovado QA",
    },
    {
      stepNumber: 2,
      action: "Executar o cenario principal",
      expectedResult: "Sistema deve concluir a acao esperada",
      actualResult: "Acao concluida com sucesso",
      status: "Aprovado QA",
    },
    {
      stepNumber: 3,
      action: "Conferir registros e mensagens",
      expectedResult: "Dados e mensagens devem estar corretos",
      actualResult: "Dados e mensagens conferidos sem divergencia",
      status: "Aprovado QA",
    },
  ];
};

async function main() {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        in: ["QA", "ADMIN"],
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  const testers = users.filter((user) => user.role === "QA");
  const fallbackUsers = testers.length > 0 ? testers : users;

  await prisma.testStep.deleteMany({
    where: {
      report: {
        code: {
          startsWith: SEED_CODE_PREFIX,
        },
      },
    },
  });

  await prisma.testReport.deleteMany({
    where: {
      code: {
        startsWith: SEED_CODE_PREFIX,
      },
    },
  });

  for (let index = 1; index <= REPORT_COUNT; index += 1) {
    const scenario = scenarios[(index - 1) % scenarios.length];
    const tester = fallbackUsers[(index - 1) % Math.max(fallbackUsers.length, 1)];
    const status = statusByIndex(index);
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - (index - 1));

    await prisma.testReport.create({
      data: {
        code: `${SEED_CODE_PREFIX}${String(index).padStart(3, "0")}`,
        testDate,
        systemName: systems[(index - 1) % systems.length],
        branch: branches[(index - 1) % branches.length],
        screenPath: scenario.screenPath,
        functionality: scenario.functionality,
        bugDescription: scenario.bugDescription,
        testType: testTypes[(index - 1) % testTypes.length],
        generalStatus: status,
        notes: `Relatorio gerado por seed para testar listagem e paginacao (${index}/${REPORT_COUNT}).`,
        testerId: tester?.id || null,
        testerName: tester?.name || null,
        sndeskTechnicianName: technicians[(index - 1) % technicians.length],
        sndeskChamadoId: index % 5 === 0 ? `SEED-SNDESK-${index}` : null,
        steps: {
          create: stepsForStatus(status),
        },
      },
    });
  }

  console.log(
    `Seed executado com sucesso: ${REPORT_COUNT} relatorios ${SEED_CODE_PREFIX} criados.`
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
