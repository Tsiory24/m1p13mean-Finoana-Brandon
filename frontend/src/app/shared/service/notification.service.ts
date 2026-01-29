import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private idCounter = 0;

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  success(message: string, duration: number = 5000): void {
    this.addNotification('success', message, duration);
  }

  error(message: string, duration: number = 7000): void {
    this.addNotification('error', message, duration);
  }

  warning(message: string, duration: number = 6000): void {
    this.addNotification('warning', message, duration);
  }

  info(message: string, duration: number = 5000): void {
    this.addNotification('info', message, duration);
  }

  private addNotification(type: Notification['type'], message: string, duration: number): void {
    const notification: Notification = {
      id: ++this.idCounter,
      type,
      message,
      duration
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);

    if (duration > 0) {
      setTimeout(() => this.remove(notification.id), duration);
    }
  }

  remove(id: number): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
  }

  clear(): void {
    this.notifications$.next([]);
  }
}
