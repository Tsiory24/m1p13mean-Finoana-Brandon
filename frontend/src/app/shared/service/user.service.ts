import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environnements/environnement';

export interface UserItem {
  _id: string;
  nom: string;
  email?: string;
  contact: string;
  role: 'admin' | 'responsable_boutique' | 'acheteur';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  success: boolean;
  data: UserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserResponse {
  success: boolean;
  data: UserItem;
  message?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  nom: string;
  motDePasse: string;
  email?: string;
  contact: string;
  role?: string;
}

export interface UpdateUserPayload {
  nom?: string;
  email?: string;
  contact?: string;
  role?: string;
  isActive?: boolean;
  motDePasse?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}api/users`;

  constructor(private http: HttpClient) {}

  getAll(filters: UserFilters = {}): Observable<UsersResponse> {
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.isActive !== undefined && filters.isActive !== '') params = params.set('isActive', filters.isActive);
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    return this.http.get<UsersResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateUserPayload): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<{ success: boolean; message: string; data: any }>(
      `${environment.apiBaseUrl}api/auth/register`,
      payload
    );
  }

  update(id: string, payload: UpdateUserPayload): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
