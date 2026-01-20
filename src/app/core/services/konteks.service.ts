import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  KonteksDetailResponse,
  KonteksListResponse,
  UpdateKonteksPayload,
  RiskCategoryListResponse,
  RiskCategoryDetailResponse,
  CreateRiskCategoryPayload,
  UpdateRiskCategoryPayload,
  LikelihoodScaleListResponse,
  LikelihoodScaleDetailResponse,
  CreateLikelihoodPayload,
  UpdateLikelihoodPayload,
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

  getKonteksList(params?: { page?: number; limit?: number }): Observable<KonteksListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<KonteksListResponse>(`${this.baseUrl}/konteks`, {
      params: httpParams,
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

  generateDefaultLikelihoods(
    konteksId: string,
    categoryId: string
  ): Observable<LikelihoodScaleDetailResponse[]> {
    const defaults: CreateLikelihoodPayload[] = [
      { level: 1, label: 'Sangat Jarang', description: 'Kemungkinan terjadi < 5% atau hampir tidak pernah terjadi' },
      { level: 2, label: 'Jarang', description: 'Kemungkinan terjadi 5-25% atau jarang terjadi' },
      { level: 3, label: 'Mungkin', description: 'Kemungkinan terjadi 25-50% atau mungkin terjadi' },
      { level: 4, label: 'Sering', description: 'Kemungkinan terjadi 50-75% atau sering terjadi' },
      { level: 5, label: 'Sangat Sering', description: 'Kemungkinan terjadi > 75% atau hampir pasti terjadi' },
    ];

    const requests = defaults.map((payload) =>
      this.createLikelihoodScale(konteksId, categoryId, payload)
    );

    return forkJoin(requests);
  }
}
