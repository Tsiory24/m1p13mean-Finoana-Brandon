import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface BoutiqueNotification {
  _id: string;
  type: 'boutique_creation' | 'reservation_locale' | string;
  message: string;
  targetRole: string;
  lu: boolean;
  data: Record<string, any>;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BoutiqueNotificationService {
  constructor(private api: ApiService) {}

  getAll(): Observable<{ notifications: BoutiqueNotification[]; unreadCount: number }> {
    return this.api.getList<any>('api/notifications').pipe(
      map(res => res.data)
    );
  }

  markAsRead(id: string): Observable<BoutiqueNotification> {
    return this.api.updates<any>(`api/notifications/${id}/lire`, {}).pipe(
      map(res => res.data.notification)
    );
  }

  markAllAsRead(): Observable<any> {
    return this.api.updates<any>('api/notifications/lire-tout', {});
  }
}
