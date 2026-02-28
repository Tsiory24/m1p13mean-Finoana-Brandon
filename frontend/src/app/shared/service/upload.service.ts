import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environnements/environnement';

export interface UploadResult {
  url: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  upload(file: File): Observable<UploadResult> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ success: boolean; url: string; filename: string }>(
      `${this.base}api/upload`, fd
    ).pipe(map(r => ({ url: r.url, filename: r.filename })));
  }

  deleteFile(filename: string): Observable<void> {
    return this.http.request<void>('DELETE', `${this.base}api/upload`, {
      body: { filename }
    });
  }
}
