import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  KonteksDetailResponse,
  KonteksListResponse,
  KonteksStatus,
  CreateKonteksPayload,
  UpdateKonteksPayload,
  RiskCategoryListResponse,
  RiskCategoryDetailResponse,
  CreateRiskCategoryPayload,
  UpdateRiskCategoryPayload,
  LikelihoodScaleListResponse,
  LikelihoodScaleDetailResponse,
  CreateLikelihoodPayload,
  UpdateLikelihoodPayload,
  ImpactScaleListResponse,
  ImpactScaleDetailResponse,
  CreateImpactPayload,
  UpdateImpactPayload,
  RiskMatrixListResponse,
  RiskMatrixDetailResponse,
  CreateRiskMatrixPayload,
  CreateRiskMatrixBulkPayload,
  RiskMatrixBulkResponse,
  UpdateRiskMatrixPayload,
} from '../models/konteks.model';

@Injectable({ providedIn: 'root' })
export class KonteksService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private buildHeaders(): HttpHeaders | undefined {
    const token =
      localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    if (!token) return undefined;
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // ===================== KONTEKS =====================

  getKonteksById(id: string): Observable<KonteksDetailResponse> {
    return this.http.get<KonteksDetailResponse>(`${this.baseUrl}/konteks/${id}`, {
      withCredentials: true,
    });
  }

  getKonteksList(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    status?: KonteksStatus;
    isSystemDefault?: boolean;
  }): Observable<KonteksListResponse> {
    const headers = this.buildHeaders();
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.status) {
      httpParams = httpParams.set('status', String(params.status));
    } else if (typeof params?.isActive === 'boolean') {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }
    if (typeof params?.isSystemDefault === 'boolean') {
      httpParams = httpParams.set('isSystemDefault', String(params.isSystemDefault));
    }

    return this.http.get<KonteksListResponse>(`${this.baseUrl}/konteks`, {
      params: httpParams,
      withCredentials: true,
      headers,
    });
  }

  createKonteks(payload: CreateKonteksPayload): Observable<KonteksDetailResponse> {
    return this.http.post<KonteksDetailResponse>(`${this.baseUrl}/konteks`, payload, {
      withCredentials: true,
    });
  }

  updateKonteks(id: string, payload: UpdateKonteksPayload): Observable<KonteksDetailResponse> {
    return this.http.patch<KonteksDetailResponse>(`${this.baseUrl}/konteks/${id}`, payload, {
      withCredentials: true,
    });
  }

  activateKonteks(id: string): Observable<KonteksDetailResponse> {
    return this.http.patch<KonteksDetailResponse>(`${this.baseUrl}/konteks/${id}/activate`, null, {
      withCredentials: true,
    });
  }

  deactivateKonteks(id: string): Observable<KonteksDetailResponse> {
    return this.http.patch<KonteksDetailResponse>(`${this.baseUrl}/konteks/${id}/deactivate`, null, {
      withCredentials: true,
    });
  }

  // ===================== RISK CATEGORIES =====================

  getRiskCategories(
    konteksId: string,
    params?: { page?: number; limit?: number }
  ): Observable<RiskCategoryListResponse> {
    const headers = this.buildHeaders();
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<RiskCategoryListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories`,
      { params: httpParams, withCredentials: true, headers }
    );
  }

  createRiskCategory(
    konteksId: string,
    payload: CreateRiskCategoryPayload
  ): Observable<RiskCategoryDetailResponse> {
    return this.http.post<RiskCategoryDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories`,
      payload,
      { withCredentials: true }
    );
  }

  updateRiskCategory(
    konteksId: string,
    riskCategoryId: string,
    payload: UpdateRiskCategoryPayload
  ): Observable<RiskCategoryDetailResponse> {
    return this.http.patch<RiskCategoryDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${riskCategoryId}`,
      payload,
      { withCredentials: true }
    );
  }

  deleteRiskCategory(konteksId: string, riskCategoryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${riskCategoryId}`,
      { withCredentials: true }
    );
  }

  // ===================== LIKELIHOOD SCALES =====================

  getLikelihoodScales(
    konteksId: string,
    categoryId: string,
    params?: { page?: number; limit?: number }
  ): Observable<LikelihoodScaleListResponse> {
    const headers = this.buildHeaders();
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<LikelihoodScaleListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/likelihood-scales`,
      { params: httpParams, withCredentials: true, headers }
    );
  }

  createLikelihoodScale(
    konteksId: string,
    categoryId: string,
    payload: CreateLikelihoodPayload
  ): Observable<LikelihoodScaleDetailResponse> {
    return this.http.post<LikelihoodScaleDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/likelihood-scales`,
      payload,
      { withCredentials: true }
    );
  }

  updateLikelihoodScale(
    konteksId: string,
    categoryId: string,
    likelihoodId: string,
    payload: UpdateLikelihoodPayload
  ): Observable<LikelihoodScaleDetailResponse> {
    return this.http.patch<LikelihoodScaleDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/likelihood-scales/${likelihoodId}`,
      payload,
      { withCredentials: true }
    );
  }

  deleteLikelihoodScale(
    konteksId: string,
    categoryId: string,
    likelihoodId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/likelihood-scales/${likelihoodId}`,
      { withCredentials: true }
    );
  }


  // ===================== IMPACT SCALES =====================

  getImpactScales(
    konteksId: string,
    categoryId: string,
    params?: { page?: number; limit?: number }
  ): Observable<ImpactScaleListResponse> {
    const headers = this.buildHeaders();
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<ImpactScaleListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/impact-scales`,
      { params: httpParams, withCredentials: true, headers }
    );
  }

  createImpactScale(
    konteksId: string,
    categoryId: string,
    payload: CreateImpactPayload
  ): Observable<ImpactScaleDetailResponse> {
    return this.http.post<ImpactScaleDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/impact-scales`,
      payload,
      { withCredentials: true }
    );
  }

  updateImpactScale(
    konteksId: string,
    categoryId: string,
    impactId: string,
    payload: UpdateImpactPayload
  ): Observable<ImpactScaleDetailResponse> {
    return this.http.patch<ImpactScaleDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/impact-scales/${impactId}`,
      payload,
      { withCredentials: true }
    );
  }

  deleteImpactScale(
    konteksId: string,
    categoryId: string,
    impactId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/impact-scales/${impactId}`,
      { withCredentials: true }
    );
  }

  // ===================== RISK MATRICES =====================

  getRiskMatrices(
    konteksId: string,
    params?: { page?: number; limit?: number }
  ): Observable<RiskMatrixListResponse> {
    const headers = this.buildHeaders();
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<RiskMatrixListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices`,
      { params: httpParams, withCredentials: true, headers }
    );
  }

  getRiskMatrixById(
    konteksId: string,
    matrixId: string
  ): Observable<RiskMatrixDetailResponse> {
    return this.http.get<RiskMatrixDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices/${matrixId}`,
      { withCredentials: true }
    );
  }

  createRiskMatrix(
    konteksId: string,
    payload: CreateRiskMatrixPayload
  ): Observable<RiskMatrixDetailResponse> {
    return this.http.post<RiskMatrixDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices`,
      payload,
      { withCredentials: true }
    );
  }

  createRiskMatricesBulk(
    konteksId: string,
    payload: CreateRiskMatrixBulkPayload
  ): Observable<RiskMatrixBulkResponse> {
    return this.http.post<RiskMatrixBulkResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices/bulk`,
      payload,
      { withCredentials: true }
    );
  }

  updateRiskMatrix(
    konteksId: string,
    matrixId: string,
    payload: UpdateRiskMatrixPayload
  ): Observable<RiskMatrixDetailResponse> {
    return this.http.patch<RiskMatrixDetailResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices/${matrixId}`,
      payload,
      { withCredentials: true }
    );
  }

  deleteRiskMatrix(
    konteksId: string,
    matrixId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices/${matrixId}`,
      { withCredentials: true }
    );
  }

}
