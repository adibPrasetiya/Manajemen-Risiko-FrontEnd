export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface KonteksItem {
  id: string;
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  _count?: {
    riskCategories: number;
    riskMatrices: number;
  };
}

export interface KonteksDetailResponse {
  message: string;
  data: KonteksItem;
}

export interface KonteksListResponse {
  message: string;
  data: KonteksItem[];
  pagination: Pagination;
}

export interface UpdateKonteksPayload {
  name?: string;
  code?: string;
  description?: string;
  periodStart?: number;
  periodEnd?: number;
  matrixSize?: number;
  riskAppetiteLevel?: string;
  riskAppetiteDescription?: string;
  isActive?: boolean;
}

export interface KonteksFormModel {
  name: string;
  description: string;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
}

export interface CreateKonteksPayload {
  name: string;
  code: string;
  description: string;
  periodStart: number;
  periodEnd: number;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
}

export interface EditKonteksModel {
  id: string;
  name: string;
  code: string;
  description: string;
  periodStart: number | null;
  periodEnd: number | null;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
  isActive: boolean;
}

export interface CreateKonteksModel {
  name: string;
  code: string;
  description: string;
  periodStart: number | null;
  periodEnd: number | null;
  matrixSize: number;
  riskAppetiteLevel: string;
  riskAppetiteDescription: string;
}

export interface RiskCategory {
  id: string;
  konteksId: string;
  name: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  konteks?: {
    id: string;
    name: string;
    code: string;
    periodStart?: number;
    periodEnd?: number;
    isActive?: boolean;
  };
}

export interface RiskCategoryListResponse {
  message: string;
  data: RiskCategory[];
  pagination: Pagination;
}

export interface RiskCategoryDetailResponse {
  message: string;
  data: RiskCategory;
}

export interface CreateRiskCategoryPayload {
  name: string;
  description: string;
  order: number;
}

export interface UpdateRiskCategoryPayload {
  name: string;
  description: string;
  order: number;
}

export interface LikelihoodScale {
  id: string;
  riskCategoryId: string;
  level: number;
  label: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  riskCategory?: {
    id: string;
    name: string;
    order: number;
    konteks?: {
      id: string;
      name: string;
      code: string;
      periodStart: number;
      periodEnd: number;
      isActive: boolean;
    };
  };
}

export interface LikelihoodScaleListResponse {
  message: string;
  data: LikelihoodScale[];
  pagination: Pagination;
}

export interface LikelihoodScaleDetailResponse {
  message: string;
  data: LikelihoodScale;
}

export interface CreateLikelihoodPayload {
  level: number;
  label: string;
  description: string;
}

export interface UpdateLikelihoodPayload {
  level: number;
  label: string;
  description: string;
}

export interface ImpactScale {
  id: string;
  riskCategoryId: string;
  level: number;
  label: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  riskCategory?: {
    id: string;
    name: string;
    order: number;
    konteks?: {
      id: string;
      name: string;
      code: string;
      periodStart: number;
      periodEnd: number;
      isActive: boolean;
    };
  };
}

export interface ImpactScaleListResponse {
  message: string;
  data: ImpactScale[];
  pagination: Pagination;
}

export interface ImpactScaleDetailResponse {
  message: string;
  data: ImpactScale;
}

export interface CreateImpactPayload {
  level: number;
  label: string;
  description: string;
}

export interface UpdateImpactPayload {
  level: number;
  label: string;
  description: string;
}

export type TabKey = 'RISK_CATEGORY' | 'RISK_IMPACT' | 'LIKELIHOOD' | 'RISK_MATRIX';

// ===================== RISK MATRIX =====================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskMatrixItem {
  id: string;
  konteksId: string;
  likelihoodLevel: number;
  impactLevel: number;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface RiskMatrixListResponse {
  message: string;
  data: RiskMatrixItem[];
  pagination: Pagination;
}

export interface RiskMatrixEntry {
  likelihoodLevel: number;
  impactLevel: number;
  riskLevel: RiskLevel;
}

export interface CreateRiskMatrixBulkPayload {
  matrices: RiskMatrixEntry[];
}

export interface RiskMatrixBulkResponse {
  message: string;
  data: {
    created: RiskMatrixItem[];
    createdCount: number;
    totalInKonteks: number;
    expectedTotal: number;
    isComplete: boolean;
  };
}

export interface RiskMatrixDetailResponse {
  message: string;
  data: RiskMatrixItem;
}

export interface UpdateRiskMatrixPayload {
  riskLevel: RiskLevel;
}

export interface RiskLevelConfig {
  level: RiskLevel;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
}
