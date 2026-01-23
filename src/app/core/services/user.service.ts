import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

export type UnitKerjaPayload = {
  name: string;
  code: string;
  email?: string;
};

export type AssetCategoryItem = {
  id: string;
  name: string;
  description?: string;
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
};

export type AssetCategoryPayload = {
  name: string;
  description: string;
};

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = 'http://api.dev.simulasibimtekd31.com';
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
    return new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));
  }
}
