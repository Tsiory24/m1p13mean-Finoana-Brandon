import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DureeContratService, DureeContratItem } from '../../shared/service/duree-contrat.service';

@Component({
  selector: 'app-duree-contrat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duree-contrat.html',
  styleUrl: './duree-contrat.scss'
})
export class DureeContratComponent implements OnInit {
  allDurees: DureeContratItem[] = [];
  filteredDurees: DureeContratItem[] = [];
  loading = false;
  error = '';

  // Pagination
  page = 1;
  limit = 10;

  // Create form
  showForm = false;
  formDuree: number | null = null;
  formError = '';
  formSuccess = '';
  submitting = false;
  showConfirm = false;

  constructor(private dureeService: DureeContratService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.dureeService.getAll().subscribe({
      next: (data) => {
        // backend already returns sorted by createdAt desc
        this.allDurees = data;
        this.filteredDurees = [...data];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.formDuree = null;
    this.formError = '';
    this.formSuccess = '';
    this.showConfirm = false;
  }

  onSubmit(): void {
    this.formError = '';
    if (!this.formDuree || isNaN(Number(this.formDuree)) || Number(this.formDuree) <= 0) {
      this.formError = 'La durée doit être un nombre entier positif (en mois)';
      return;
    }
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
  }

  confirmCreate(): void {
    this.showConfirm = false;
    this.submitting = true;
    this.formError = '';

    this.dureeService.create(Number(this.formDuree)).subscribe({
      next: () => {
        this.formSuccess = `Durée de ${this.formDuree} mois enregistrée avec succès !`;
        this.submitting = false;
        this.formDuree = null;
        this.showForm = false;
        setTimeout(() => {
          this.formSuccess = '';
          this.load();
        }, 1500);
      },
      error: (err) => {
        this.formError = err?.error?.message || 'Erreur lors de la création';
        this.submitting = false;
      }
    });
  }

  // Pagination
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredDurees.length / this.limit)); }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) range.push(i);
    return range;
  }

  get pagedDurees(): DureeContratItem[] {
    const start = (this.page - 1) * this.limit;
    return this.filteredDurees.slice(start, start + this.limit);
  }

  get firstItemIndex(): number {
    return this.filteredDurees.length === 0 ? 0 : (this.page - 1) * this.limit + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.page * this.limit, this.filteredDurees.length);
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
