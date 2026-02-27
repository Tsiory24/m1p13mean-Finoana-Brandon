import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface DureeContratItem {
  _id: string;
  duree: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DureeContratService {
  private readonly endpoint = 'api/duree-contrats';

  constructor(private api: ApiService) {}

  getAll(): Observable<DureeContratItem[]> {
    return this.api.getList<{ success: boolean; data: { durees: DureeContratItem[] } }>(this.endpoint)
      .pipe(map(res => res.data.durees ?? []));
  }

  create(duree: number): Observable<DureeContratItem> {
    return this.api.create<{ success: boolean; data: { savedDuree: DureeContratItem } }>(this.endpoint, { duree })
      .pipe(map(res => res.data.savedDuree));
  }
}
