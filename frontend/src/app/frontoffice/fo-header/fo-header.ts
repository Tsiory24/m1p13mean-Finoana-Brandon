import { Component, OnInit, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/service/auth.service';
import { CategorieService, CategorieItem } from '../../shared/service/categorie.service';

@Component({
  selector: 'app-fo-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fo-header.html',
  styleUrl: './fo-header.scss'
})
export class FoHeaderComponent implements OnInit {
  searchQuery = '';
  categories: CategorieItem[] = [];
  menuOpen = signal(false);
  searchOpen = signal(false);
  profileOpen = signal(false);

  constructor(
    public authService: AuthService,
    private categorieService: CategorieService,
    private router: Router,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.categorieService.getAllCategories().subscribe({
      next: cats => this.categories = cats,
      error: () => {}
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/boutiques'], { queryParams: { q: this.searchQuery.trim() } });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/backoffice']);
  }

  goToDashboard(): void {
    this.router.navigate(['/backoffice/dashboard']);
  }

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  toggleSearch(): void {
    this.searchOpen.set(!this.searchOpen());
    if (!this.searchOpen()) {
      this.searchQuery = '';
    }
  }

  toggleProfile(): void {
    this.profileOpen.set(!this.profileOpen());
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.profileOpen.set(false);
      this.searchOpen.set(false);
    }
  }

  get userInitials(): string {
    const nom = this.authService.currentUser?.nom ?? '';
    return nom.slice(0, 2).toUpperCase() || 'U';
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }
}
