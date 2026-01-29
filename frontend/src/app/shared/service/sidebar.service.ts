// sidebar.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // On initialise directement à partir du localStorage
  private menuSubject: BehaviorSubject<string> = new BehaviorSubject<string>(
    localStorage.getItem('currentMenu') || 'default'
  );

  menu$ = this.menuSubject.asObservable();

  setMenu(menu: string) {
    this.menuSubject.next(menu);
    localStorage.setItem('currentMenu', menu);
  }

  clearMenu() {
    this.menuSubject.next('default');
    localStorage.removeItem('currentMenu');
  }
}
