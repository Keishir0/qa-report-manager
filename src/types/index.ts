export type StepStatus = "Passou" | "Falhou" | "Bloqueado" | "Não executado";
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
  | "Master"
  | "Alfa"
  | "Master / Alfa"
  | "Homologação"
  | "Produção"
  | "Desenvolvimento";

export const STEP_STATUS_OPTIONS: StepStatus[] = [
  "Passou",
  "Falhou",
  "Bloqueado",
  "Não executado",
];

export const GENERAL_STATUS_OPTIONS: GeneralStatus[] = [
  "Passou",
  "Falhou",
  "Bloqueado",
  "Não executado",
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
  "Master",
  "Alfa",
  "Master / Alfa",
  "Homologação",
  "Produção",
  "Desenvolvimento",
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
  testDate: Date | string;
  systemName: string;
  branch: Branch | string;
  screenPath: string;
  functionality: string;
  bugDescription: string;
  testType: TestType | string;
  generalStatus: GeneralStatus;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
