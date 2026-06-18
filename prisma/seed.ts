import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes para evitar duplicidade no seed
  await prisma.testStep.deleteMany({});
  await prisma.testReport.deleteMany({});

  const report = await prisma.testReport.create({
    data: {
      code: "QA-001",
      testDate: new Date(),
      systemName: "SNDesk",
      branch: "master, alfa",
      screenPath: "Menu Rápido > Configurações > Minha Empresa",
      functionality: "Horário de funcionamento da empresa",
      bugDescription: "Ao salvar horários de funcionamento com algum dia em branco, o sistema deslocava os horários dos dias seguintes para o campo anterior.",
      testType: "Reteste",
      generalStatus: "Aprovado QA",
      notes: "Bug não reproduzido nos cenários testados.",
      steps: {
        create: [
          {
            stepNumber: 1,
            action: "Acessar Menu Rápido",
            expectedResult: "Menu deve ser exibido",
            actualResult: "Menu exibido corretamente",
            status: "Aprovado QA",
          },
          {
            stepNumber: 2,
            action: "Acessar Configurações",
            expectedResult: "Tela deve abrir",
            actualResult: "Tela aberta corretamente",
            status: "Aprovado QA",
          },
          {
            stepNumber: 3,
            action: "Acessar Minha Empresa",
            expectedResult: "Tela deve abrir",
            actualResult: "Tela aberta corretamente",
            status: "Aprovado QA",
          },
          {
            stepNumber: 4,
            action: "Preencher horários na segunda e sexta, deixar demais em branco",
            expectedResult: "Devem ser aceitos",
            actualResult: "Preenchidos corretamente",
            status: "Aprovado QA",
          },
          {
            stepNumber: 5,
            action: "Clicar em salvar",
            expectedResult: "Sistema deve salvar nos dias corretos",
            actualResult: "Salvos corretamente",
            status: "Aprovado QA",
          },
          {
            stepNumber: 6,
            action: "Conferir após salvar",
            expectedResult: "Não deve haver deslocamento",
            actualResult: "Permaneceram corretos",
            status: "Aprovado QA",
          },
        ],
      },
    },
  });

  console.log("Seed executado com sucesso! Relatório criado:", report.code);
}

main()
  .catch((e) => {
    console.error("Erro ao executar o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
