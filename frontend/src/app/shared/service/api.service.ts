import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environnements/environnement';
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getList<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }

  getById<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}/${id}`);
  }

  create<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers });
  }

  update<T>(endpoint: string, body: T): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  patch<T>(endpoint: string, body: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  delete(endpoint: string, id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${endpoint}/${id}`);
  }
  deletes(url: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}${url}`);
}
getSingle<T>(endpoint: string, params?: HttpParams): Observable<T> {
  return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
}

deletest(endpoint: string, params?: HttpParams): Observable<any> {
  return this.http.delete(`${this.baseUrl}${endpoint}`, { params });
}
updates<T>(endpoint: string, body: any, params?: HttpParams): Observable<T> {
  return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { params });
}

postBlob(endpoint: string, body?: any): Observable<Blob> {
  return this.http.post(`${this.baseUrl}${endpoint}`, body || {}, { 
    responseType: 'blob' 
  });
}

}
