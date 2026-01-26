import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  KonteksDetailResponse,
  KonteksListResponse,
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
  }): Observable<KonteksListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    if (typeof params?.isActive === 'boolean') {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }

    return this.http.get<KonteksListResponse>(`${this.baseUrl}/konteks`, {
      params: httpParams,
      withCredentials: true,
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
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<RiskCategoryListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories`,
      { params: httpParams, withCredentials: true }
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
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<LikelihoodScaleListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/likelihood-scales`,
      { params: httpParams, withCredentials: true }
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
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<ImpactScaleListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-categories/${categoryId}/impact-scales`,
      { params: httpParams, withCredentials: true }
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
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<RiskMatrixListResponse>(
      `${this.baseUrl}/konteks/${konteksId}/risk-matrices`,
      { params: httpParams, withCredentials: true }
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
