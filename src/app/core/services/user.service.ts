import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type UserItem = {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type UsersResponse = {
  message: string;
  data: UserItem[];
  pagination: Pagination;
};

export type PatchUserPayload = {
  email: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
};

export type UserListParams = {
  page: number;
  limit: number;
  name?: string;
  username?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
};

export type UserStatsParams = {
  name?: string;
  username?: string;
  role?: string;
  isVerified?: boolean;
};

export type UserStats = {
  total: number;
  active: number;
  inactive: number;
};

export type UnitKerjaItem = {
  id: string;
  name: string;
  code: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    profiles?: number;
  };
};

export type UnitKerjaListResponse = {
  message: string;
  data: UnitKerjaItem[];
  pagination?: Pagination;
};

export type UnitKerjaListParams = {
  page: number;
  limit: number;
};

export type UnitKerjaDetailResponse = {
  message: string;
  data: UnitKerjaItem;
};

export type UnitKerjaPayload = {
  name: string;
  code: string;
  email?: string;
};

export type AssetCategoryItem = {
  id: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt?: string;
  _count?: {
    assets?: number;
  };
};

export type AssetCategoryListResponse = {
  message: string;
  data: AssetCategoryItem[];
  pagination?: Pagination;
};

export type AssetCategoryListParams = {
  page: number;
  limit: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
};

export type AssetCategoryPayload = {
  name: string;
  description: string;
};

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type AssetItem = {
  id: string;
  name: string;
  code: string;
  description?: string;
  owner?: string;
  status: AssetStatus;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string | null;
  unitKerja?: {
    id: string;
    name: string;
    code?: string;
  };
  category?: {
    id: string;
    name: string;
  };
};

export type AssetListResponse = {
  message: string;
  data: AssetItem[];
  pagination?: Pagination;
};

export type AssetDetailResponse = {
  message: string;
  data: AssetItem;
};

export type AssetListParams = {
  page: number;
  limit: number;
  status?: AssetStatus;
};

export type CreateAssetPayload = {
  name: string;
  code: string;
  description?: string;
  owner?: string;
  categoryId: string;
  status?: AssetStatus;
};

export type UpdateAssetPayload = {
  name: string;
  code: string;
  description?: string;
  owner?: string;
  categoryId: string;
};

export type RiskWorksheetStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type RiskWorksheetItem = {
  id: string;
  name: string;
  description?: string;
  status: RiskWorksheetStatus;
  ownerId?: string;
  createdAt: string;
  updatedAt?: string;
  unitKerja?: {
    id: string;
    name: string;
    code?: string;
  };
  konteks?: {
    id: string;
    name: string;
    code?: string;
    periodStart?: number;
    periodEnd?: number;
  };
};

export type RiskWorksheetListResponse = {
  message: string;
  data: RiskWorksheetItem[];
  pagination?: Pagination;
};

export type RiskWorksheetDetailResponse = {
  message: string;
  data: RiskWorksheetItem;
};

export type RiskWorksheetListParams = {
  page: number;
  limit: number;
  status?: RiskWorksheetStatus;
};

export type CreateRiskWorksheetPayload = {
  konteksId: string;
  name: string;
  description?: string;
  status?: RiskWorksheetStatus;
};

export type UpdateRiskWorksheetPayload = {
  name: string;
  description?: string;
};

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.apiBaseUrl;
  private usersEndpoint = '/users';
  private unitKerjaEndpoint = '/unit-kerja';
  private assetCategoriesEndpoint = '/asset-categories';

  constructor(private http: HttpClient) {}

  hasAuthToken(): boolean {
    return !!(
      localStorage.getItem('accessToken') || localStorage.getItem('access_token')
    );
  }

  // ===================== USERS =====================

  getUsers(params: UserListParams): Observable<UsersResponse> {
    const headers = this.buildHeaders();
    const httpParams = this.buildUsersParams(params);

    return this.http.get<UsersResponse>(`${this.baseUrl}${this.usersEndpoint}`, {
      headers,
      params: httpParams,
    });
  }

  getUserStats(params: UserStatsParams): Observable<UserStats> {
    const headers = this.buildHeaders();
    const url = `${this.baseUrl}${this.usersEndpoint}`;

    const total$ = this.http
      .get<UsersResponse>(url, {
        headers,
        params: this.buildUserStatsParams(params, null),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const active$ = this.http
      .get<UsersResponse>(url, {
        headers,
        params: this.buildUserStatsParams(params, true),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    const inactive$ = this.http
      .get<UsersResponse>(url, {
        headers,
        params: this.buildUserStatsParams(params, false),
      })
      .pipe(
        map((r) => r?.pagination?.totalItems ?? 0),
        catchError(() => of(0))
      );

    return forkJoin({ total: total$, active: active$, inactive: inactive$ });
  }

  updateUser(id: string, payload: PatchUserPayload): Observable<unknown> {
    const headers = this.buildHeaders();
    return this.http.patch(`${this.baseUrl}${this.usersEndpoint}/${id}`, payload, {
      headers,
    });
  }

  // ===================== UNIT KERJA =====================

  getUnitKerjaList(params: UnitKerjaListParams): Observable<UnitKerjaListResponse> {
    const headers = this.buildHeaders();
    const httpParams = this.buildUnitKerjaParams(params);

    return this.http.get<UnitKerjaListResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}`,
      { headers, params: httpParams }
    );
  }

  getUnitKerjaById(id: string): Observable<UnitKerjaDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.get<UnitKerjaDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${id}`,
      { headers }
    );
  }

  updateUnitKerja(id: string, payload: UnitKerjaPayload): Observable<unknown> {
    const headers = this.buildHeaders();
    return this.http.patch(`${this.baseUrl}${this.unitKerjaEndpoint}/${id}`, payload, {
      headers,
    });
  }

  deleteUnitKerja(id: string): Observable<unknown> {
    const headers = this.buildHeaders();
    return this.http.delete(`${this.baseUrl}${this.unitKerjaEndpoint}/${id}`, {
      headers,
    });
  }

  createUnitKerja(payload: UnitKerjaPayload): Observable<{ data?: UnitKerjaItem }> {
    const headers = this.buildHeaders();
    return this.http.post<{ data?: UnitKerjaItem }>(
      `${this.baseUrl}${this.unitKerjaEndpoint}`,
      payload,
      { headers }
    );
  }

  // ===================== ASSET CATEGORIES =====================

  getAssetCategories(
    params: AssetCategoryListParams
  ): Observable<AssetCategoryListResponse> {
    const headers = this.buildHeaders();
    const httpParams = this.buildAssetCategoriesParams(params);

    return this.http.get<AssetCategoryListResponse>(
      `${this.baseUrl}${this.assetCategoriesEndpoint}`,
      { headers, params: httpParams }
    );
  }

  createAssetCategory(
    payload: AssetCategoryPayload
  ): Observable<{ data?: AssetCategoryItem }> {
    const headers = this.buildHeaders();
    return this.http.post<{ data?: AssetCategoryItem }>(
      `${this.baseUrl}${this.assetCategoriesEndpoint}`,
      payload,
      { headers }
    );
  }

  updateAssetCategory(id: string, payload: AssetCategoryPayload): Observable<unknown> {
    const headers = this.buildHeaders();
    return this.http.patch(
      `${this.baseUrl}${this.assetCategoriesEndpoint}/${id}`,
      payload,
      { headers }
    );
  }

  deleteAssetCategory(id: string): Observable<unknown> {
    const headers = this.buildHeaders();
    return this.http.delete(
      `${this.baseUrl}${this.assetCategoriesEndpoint}/${id}`,
      { headers }
    );
  }

  // ===================== ASSETS =====================

  getAssets(
    unitKerjaId: string,
    params: AssetListParams
  ): Observable<AssetListResponse> {
    const headers = this.buildHeaders();
    const httpParams = this.buildAssetsParams(params);

    return this.http.get<AssetListResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets`,
      { headers, params: httpParams }
    );
  }

  getAssetById(
    unitKerjaId: string,
    assetId: string
  ): Observable<AssetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.get<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets/${assetId}`,
      { headers }
    );
  }

  createAsset(
    unitKerjaId: string,
    payload: CreateAssetPayload
  ): Observable<AssetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.post<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets`,
      payload,
      { headers }
    );
  }

  updateAsset(
    unitKerjaId: string,
    assetId: string,
    payload: UpdateAssetPayload
  ): Observable<AssetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets/${assetId}`,
      payload,
      { headers }
    );
  }

  activateAsset(
    unitKerjaId: string,
    assetId: string
  ): Observable<AssetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets/${assetId}/activate`,
      null,
      { headers }
    );
  }

  deactivateAsset(
    unitKerjaId: string,
    assetId: string
  ): Observable<AssetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets/${assetId}/deactivate`,
      null,
      { headers }
    );
  }

  deleteAsset(
    unitKerjaId: string,
    assetId: string,
    opts?: { suppressToast?: boolean }
  ): Observable<AssetDetailResponse> {
    let headers = this.buildHeaders() || new HttpHeaders();
    if (opts?.suppressToast) {
      headers = headers.set('X-Skip-Error-Toast', 'true');
    }
    return this.http.delete<AssetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/assets/${assetId}`,
      { headers }
    );
  }

  // ===================== RISK WORKSHEETS =====================

  getRiskWorksheets(
    unitKerjaId: string,
    params: RiskWorksheetListParams
  ): Observable<RiskWorksheetListResponse> {
    const headers = this.buildHeaders();
    const httpParams = this.buildRiskWorksheetParams(params);

    return this.http.get<RiskWorksheetListResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets`,
      { headers, params: httpParams }
    );
  }

  getRiskWorksheetById(
    unitKerjaId: string,
    worksheetId: string
  ): Observable<RiskWorksheetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.get<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets/${worksheetId}`,
      { headers }
    );
  }

  createRiskWorksheet(
    unitKerjaId: string,
    payload: CreateRiskWorksheetPayload
  ): Observable<RiskWorksheetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.post<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets`,
      payload,
      { headers }
    );
  }

  updateRiskWorksheet(
    unitKerjaId: string,
    worksheetId: string,
    payload: UpdateRiskWorksheetPayload
  ): Observable<RiskWorksheetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets/${worksheetId}`,
      payload,
      { headers }
    );
  }

  activateRiskWorksheet(
    unitKerjaId: string,
    worksheetId: string
  ): Observable<RiskWorksheetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets/${worksheetId}/activate`,
      null,
      { headers }
    );
  }

  deactivateRiskWorksheet(
    unitKerjaId: string,
    worksheetId: string
  ): Observable<RiskWorksheetDetailResponse> {
    const headers = this.buildHeaders();
    return this.http.patch<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets/${worksheetId}/deactivate`,
      null,
      { headers }
    );
  }

  deleteRiskWorksheet(
    unitKerjaId: string,
    worksheetId: string,
    opts?: { suppressToast?: boolean }
  ): Observable<RiskWorksheetDetailResponse> {
    let headers = this.buildHeaders() || new HttpHeaders();
    if (opts?.suppressToast) {
      headers = headers.set('X-Skip-Error-Toast', 'true');
    }
    return this.http.delete<RiskWorksheetDetailResponse>(
      `${this.baseUrl}${this.unitKerjaEndpoint}/${unitKerjaId}/risk-worksheets/${worksheetId}`,
      { headers }
    );
  }

  private buildHeaders(): HttpHeaders | undefined {
    const token =
      localStorage.getItem('accessToken') || localStorage.getItem('access_token');
    if (!token) return undefined;

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private buildUsersParams(params: UserListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));

    const name = params.name?.trim();
    const username = params.username?.trim();
    if (name) httpParams = httpParams.set('name', name);
    if (username) httpParams = httpParams.set('username', username);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (typeof params.isActive === 'boolean') {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }
    if (typeof params.isVerified === 'boolean') {
      httpParams = httpParams.set('isVerified', String(params.isVerified));
    }

    return httpParams;
  }

  private buildUserStatsParams(
    params: UserStatsParams,
    activeOverride: boolean | null
  ): HttpParams {
    let httpParams = new HttpParams().set('page', '1').set('limit', '1');

    const name = params.name?.trim();
    const username = params.username?.trim();
    if (name) httpParams = httpParams.set('name', name);
    if (username) httpParams = httpParams.set('username', username);
    if (params.role) httpParams = httpParams.set('role', params.role);
    if (typeof params.isVerified === 'boolean') {
      httpParams = httpParams.set('isVerified', String(params.isVerified));
    }
    if (typeof activeOverride === 'boolean') {
      httpParams = httpParams.set('isActive', String(activeOverride));
    }

    return httpParams;
  }

  private buildUnitKerjaParams(params: UnitKerjaListParams): HttpParams {
    return new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));
  }

  private buildAssetCategoriesParams(params: AssetCategoryListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return httpParams;
  }

  private buildRiskWorksheetParams(params: RiskWorksheetListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return httpParams;
  }

  private buildAssetsParams(params: AssetListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return httpParams;
  }
}
