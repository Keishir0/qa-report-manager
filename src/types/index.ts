export type StepStatus = "Aprovado QA" | "Reprovado QA" | "Não Executado";
export type GeneralStatus = StepStatus;

export type TestType =
  | "Funcional"
  | "Regressão"
  | "Reteste"
  | "Exploratório"
  | "Interface / Visual"
  | "Validação de campos"
  | "Integração"
  | "Permissão / Acesso"
  | "Compatibilidade";

export type Branch =
  | "master"
  | "alfa"
  | "whats-ia"
  | "whats-chat"
  | "chufc"
  | "hospital-ebserh";

export const STEP_STATUS_OPTIONS: StepStatus[] = [
  "Aprovado QA",
  "Reprovado QA",
  "Não Executado",
];

export const GENERAL_STATUS_OPTIONS: GeneralStatus[] = [
  "Aprovado QA",
  "Reprovado QA",
  "Não Executado",
];

export const TEST_TYPE_OPTIONS: TestType[] = [
  "Funcional",
  "Regressão",
  "Reteste",
  "Exploratório",
  "Interface / Visual",
  "Validação de campos",
  "Integração",
  "Permissão / Acesso",
  "Compatibilidade",
];

export const BRANCH_OPTIONS: Branch[] = [
  "master",
  "alfa",
  "whats-ia",
  "whats-chat",
  "chufc",
  "hospital-ebserh",
];

export interface TestStepData {
  id?: string;
  reportId?: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: StepStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TestReportData {
  id?: string;
  code: string;
  sndeskChamadoId?: string | null;
  testDate: Date | string;
  systemName: string;
  branch: Branch | string;
  screenPath: string;
  functionality: string;
  bugDescription: string;
  testType: TestType | string;
  generalStatus: GeneralStatus;
  testerId?: string | null;
  testerName?: string | null;
  sndeskTechnicianName?: string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  steps?: TestStepData[];
}

export interface DashboardStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notExecuted: number;
  recentReports: TestReportData[];
}
