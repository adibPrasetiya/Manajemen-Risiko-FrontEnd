import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Types
export type ProfileRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ProfileRequestType = 'INITIAL_VERIFICATION' | 'CHANGE';

export interface UnitKerjaInfo {
  id: string;
  name: string;
  code: string;
}

export interface ProfileData {
  id: string;
  userId: string;
  jabatan: string;
  unitKerja: UnitKerjaInfo;
  nomorHP?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface VerificationRequest {
  id: string;
  status: ProfileRequestStatus;
  requestType: ProfileRequestType;
}

export interface CreateProfileResponse {
  message: string;
  data: {
    profile: ProfileData;
    verificationRequest: VerificationRequest;
  };
}

export interface UpdateProfileResponse {
  message: string;
  data: ProfileData;
}

export interface MyProfileRequest {
  id: string;
  profileId: string;
  requestType: ProfileRequestType;
  jabatan: string | null;
  unitKerjaId: string | null;
  nomorHP: string | null;
  status: ProfileRequestStatus;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  unitKerja?: UnitKerjaInfo | null;
  profile?: ProfileData;
}

export interface MyProfileRequestsResponse {
  message: string;
  data: MyProfileRequest[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MyProfileRequestDetailResponse {
  message: string;
  data: MyProfileRequest;
}

export interface CreateProfileRequestPayload {
  jabatan?: string;
  unitKerjaId?: string;
  nomorHP?: string;
}

export interface CreateProfileRequestResponse {
  message: string;
  data: MyProfileRequest;
}

export interface CancelProfileRequestResponse {
  message: string;
}

export interface MyProfileRequestsQueryParams {
  status?: ProfileRequestStatus;
  requestType?: ProfileRequestType;
  page?: number;
  limit?: number;
}

export interface GetMyProfileResponse {
  message: string;
  data: {
    username: string;
    name: string;
    email: string;
    roles: string[];
    jabatan: string;
    unitKerja: {
      id: string;
      name: string;
      email: string;
    };
    nomorHP?: string;
    isVerified: boolean;
    verifiedAt?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get current user's profile (GET /users/me/profiles)
   */
  getMyProfile(): Observable<GetMyProfileResponse> {
    return this.http.get<GetMyProfileResponse>(
      `${this.base}/users/me/profiles`,
      { withCredentials: true }
    );
  }

  /**
   * Create user profile (POST /users/me/profiles)
   * Automatically creates INITIAL_VERIFICATION request
   */
  createProfile(payload: {
    jabatan: string;
    unitKerjaId: string;
    nomorHP?: string;
  }): Observable<CreateProfileResponse> {
    return this.http.post<CreateProfileResponse>(
      `${this.base}/users/me/profiles`,
      payload,
      { withCredentials: true }
    );
  }

  /**
   * Update user profile - limited to nomorHP only (PATCH /users/me/profiles)
   * For jabatan/unitKerja changes, use createProfileRequest
   */
  updateProfile(payload: {
    nomorHP?: string;
  }): Observable<UpdateProfileResponse> {
    return this.http.patch<UpdateProfileResponse>(
      `${this.base}/users/me/profiles`,
      payload,
      { withCredentials: true }
    );
  }

  /**
   * Create profile change request (POST /users/me/profile-requests)
   * At least one field is required
   */
  createProfileRequest(
    payload: CreateProfileRequestPayload
  ): Observable<CreateProfileRequestResponse> {
    return this.http.post<CreateProfileRequestResponse>(
      `${this.base}/users/me/profile-requests`,
      payload,
      { withCredentials: true }
    );
  }

  /**
   * Get my profile requests (GET /users/me/profile-requests)
   */
  getMyProfileRequests(
    params?: MyProfileRequestsQueryParams
  ): Observable<MyProfileRequestsResponse> {
    let httpParams = new HttpParams();

    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.requestType) {
      httpParams = httpParams.set('requestType', params.requestType);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<MyProfileRequestsResponse>(
      `${this.base}/users/me/profile-requests`,
      { params: httpParams, withCredentials: true }
    );
  }

  /**
   * Get my profile request detail (GET /users/me/profile-requests/:requestId)
   */
  getMyProfileRequestDetail(
    requestId: string
  ): Observable<MyProfileRequestDetailResponse> {
    return this.http.get<MyProfileRequestDetailResponse>(
      `${this.base}/users/me/profile-requests/${requestId}`,
      { withCredentials: true }
    );
  }

  /**
   * Cancel my profile request (DELETE /users/me/profile-requests/:requestId)
   * Only PENDING requests can be cancelled
   */
  cancelMyProfileRequest(
    requestId: string
  ): Observable<CancelProfileRequestResponse> {
    return this.http.delete<CancelProfileRequestResponse>(
      `${this.base}/users/me/profile-requests/${requestId}`,
      { withCredentials: true }
    );
  }
}
