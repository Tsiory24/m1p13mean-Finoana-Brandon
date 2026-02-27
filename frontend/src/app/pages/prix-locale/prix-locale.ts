import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PrixLocaleService, PrixLocaleItem } from '../../shared/service/prix-locale.service';

@Component({
  selector: 'app-prix-locale',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './prix-locale.html',
  styleUrl: './prix-locale.scss'
})
export class PrixLocaleComponent implements OnInit {
  allPrix: PrixLocaleItem[] = [];
  filteredPrix: PrixLocaleItem[] = [];
  loading = false;
  error = '';

  // Filters
  searchText = '';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Pagination
  page = 1;
  limit = 8;

  // Delete modal
  showDeleteModal = false;
  deleteTarget: PrixLocaleItem | null = null;
  deleting = false;
  deleteError = '';

  constructor(private prixService: PrixLocaleService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.prixService.getAll().subscribe({
      next: (data) => {
        this.allPrix = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let data = [...this.allPrix];

    if (this.searchText.trim()) {
      const q = this.searchText.trim().toLowerCase();
      data = data.filter(p =>
        String(p.prix_par_m2).includes(q) ||
        (p.valider_par?.nom ?? '').toLowerCase().includes(q) ||
        (p.valider_par?.email ?? '').toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return this.sortOrder === 'asc' ? diff : -diff;
    });

    this.filteredPrix = data;
  }

  onSearchChange(): void {
    this.page = 1;
    this.applyFilters();
  }

  toggleSortDir(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  openDeleteModal(p: PrixLocaleItem): void {
    this.deleteTarget = p;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) return;
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.deleteError = '';
    this.prixService.delete(this.deleteTarget._id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.load();
      },
      error: (err) => {
        this.deleteError = err?.error?.message || 'Erreur lors de la suppression';
        this.deleting = false;
      }
    });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPrix.length / this.limit));
  }

  get pages(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  get pagedPrix(): PrixLocaleItem[] {
    const start = (this.page - 1) * this.limit;
    return this.filteredPrix.slice(start, start + this.limit);
  }

  get firstItemIndex(): number {
    return this.filteredPrix.length === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.limit, this.filteredPrix.length);
  }

  isActive(p: PrixLocaleItem): boolean {
    // First item after sort desc = the current active price
    return this.filteredPrix.length > 0 && this.filteredPrix[0]._id === p._id && this.sortOrder === 'desc';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getValideurLabel(p: PrixLocaleItem): string {
    if (!p.valider_par) return '—';
    const pre = p.valider_par.prenom ? p.valider_par.prenom + ' ' : '';
    return pre + p.valider_par.nom;
  }
}
