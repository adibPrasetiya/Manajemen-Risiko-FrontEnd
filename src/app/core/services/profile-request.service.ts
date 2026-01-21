import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Types
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RequestType = 'INITIAL_VERIFICATION' | 'CHANGE';

export interface UnitKerjaInfo {
  id: string;
  name: string;
  code: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  username: string;
}

export interface ProfileInfo {
  id: string;
  jabatan: string;
  nomorHP?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  user: UserInfo;
  unitKerja: UnitKerjaInfo;
}

export interface ProfileRequest {
  id: string;
  profileId: string;
  requestType: RequestType;
  jabatan: string;
  unitKerjaId: string;
  unitKerja: UnitKerjaInfo;
  nomorHP: string;
  status: RequestStatus;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  profile: ProfileInfo;
}

export interface ProfileRequestListResponse {
  status: string;
  message: string;
  data: ProfileRequest[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface ProfileRequestDetailResponse {
  status: string;
  message: string;
  data: ProfileRequest;
}

export interface ApproveResponse {
  status: string;
  message: string;
  data: {
    request: {
      id: string;
      status: RequestStatus;
      processedAt: string;
      processedBy: string;
    };
    profile: {
      id: string;
      jabatan: string;
      unitKerjaId: string;
      nomorHP: string;
      isVerified: boolean;
      verifiedAt: string;
      verifiedBy: string;
    };
  };
}

export interface RejectResponse {
  status: string;
  message: string;
  data: {
    id: string;
    status: RequestStatus;
    rejectionReason: string;
    processedAt: string;
    processedBy: string;
  };
}

export interface UnverifiedProfile {
  id: string;
  jabatan: string;
  nomorHP: string;
  isVerified: boolean;
  createdAt: string;
  user: UserInfo;
  unitKerja: UnitKerjaInfo;
  latestPendingRequest?: {
    id: string;
    requestType: RequestType;
    jabatan: string;
    unitKerjaId: string;
    nomorHP: string;
    status: RequestStatus;
    requestedAt: string;
  };
}

export interface UnverifiedProfilesResponse {
  status: string;
  message: string;
  data: UnverifiedProfile[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface ProfileRequestQueryParams {
  status?: RequestStatus;
  requestType?: RequestType;
  unitKerjaId?: string;
  page?: number;
  limit?: number;
}

export interface UnverifiedProfilesQueryParams {
  unitKerjaId?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileRequestService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get list of profile change requests with optional filters
   */
  getProfileRequests(
    params?: ProfileRequestQueryParams,
  ): Observable<ProfileRequestListResponse> {
    let httpParams = new HttpParams();

    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.requestType) {
      httpParams = httpParams.set('requestType', params.requestType);
    }
    if (params?.unitKerjaId) {
      httpParams = httpParams.set('unitKerjaId', params.unitKerjaId);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<ProfileRequestListResponse>(
      `${this.base}/profile-requests`,
      {
        params: httpParams,
      },
    );
  }

  /**
   * Get detail of a specific profile change request
   */
  getProfileRequestDetail(
    requestId: string,
  ): Observable<ProfileRequestDetailResponse> {
    return this.http.get<ProfileRequestDetailResponse>(
      `${this.base}/profile-requests/${requestId}`,
    );
  }

  /**
   * Approve a profile change request
   */
  approveRequest(requestId: string): Observable<ApproveResponse> {
    return this.http.patch<ApproveResponse>(
      `${this.base}/profile-requests/${requestId}/approve`,
      {},
    );
  }

  /**
   * Reject a profile change request
   */
  rejectRequest(
    requestId: string,
    rejectionReason: string,
  ): Observable<RejectResponse> {
    return this.http.patch<RejectResponse>(
      `${this.base}/profile-requests/${requestId}/reject`,
      {
        rejectionReason,
      },
    );
  }

  /**
   * Get list of unverified profiles
   */
  getUnverifiedProfiles(
    params?: UnverifiedProfilesQueryParams,
  ): Observable<UnverifiedProfilesResponse> {
    let httpParams = new HttpParams();

    if (params?.unitKerjaId) {
      httpParams = httpParams.set('unitKerjaId', params.unitKerjaId);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    return this.http.get<UnverifiedProfilesResponse>(
      `${this.base}/profiles/unverified`,
      {
        params: httpParams,
      },
    );
  }
}
