import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { UserService, UserItem, UserFilters } from '../../shared/service/user.service';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss'
})
export class UtilisateursComponent implements OnInit, OnDestroy {
  users: UserItem[] = [];
  loading = false;
  error = '';
  successMessage = '';

  // Pagination
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  // Filters
  searchText = '';
  filterRole = '';
  filterStatus = '';

  // Sorting
  sortField = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Modals state
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  submitting = false;
  deleteSubmitting = false;

  selectedUser: UserItem | null = null;

  addForm = { nom: '', motDePasse: '', email: '', contact: '', role: 'acheteur' };
  editForm = { nom: '', email: '', contact: '', role: 'acheteur' as 'admin' | 'responsable_boutique' | 'acheteur', isActive: true, motDePasse: '' };

  addFormErrors: Record<string, string> = {};
  editFormErrors: Record<string, string> = {};

  readonly roles = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'responsable_boutique', label: 'Resp. boutique' },
    { value: 'acheteur', label: 'Acheteur' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.searchSubject.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => {
      this.page = 1;
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    const filters: UserFilters = {
      page: this.page,
      limit: this.limit,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };
    if (this.searchText.trim()) filters.search = this.searchText.trim();
    if (this.filterRole) filters.role = this.filterRole;
    if (this.filterStatus !== '') filters.isActive = this.filterStatus;

    this.userService.getAll(filters).subscribe({
      next: (res) => {
        this.users = res.data;
        this.total = res.pagination.total;
        this.totalPages = res.pagination.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  onSearchChange(): void { this.searchSubject.next(this.searchText); }
  onFilterChange(): void { this.page = 1; this.loadUsers(); }

  sort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.page = 1;
    this.loadUsers();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadUsers();
  }

  get pages(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  get firstItemIndex(): number { return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1; }
  get lastItemIndex(): number { return Math.min(this.page * this.limit, this.total); }

  getRoleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label ?? role;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      admin: 'badge-admin',
      responsable_boutique: 'badge-resp',
      acheteur: 'badge-ach'
    };
    return map[role] ?? '';
  }

  // ─── Add Modal ───
  openAddModal(): void {
    this.addForm = { nom: '', motDePasse: '', email: '', contact: '', role: 'acheteur' };
    this.addFormErrors = {};
    this.successMessage = '';
    this.showAddModal = true;
  }

  closeAddModal(): void { this.showAddModal = false; }

  validateAddForm(): boolean {
    this.addFormErrors = {};
    if (!this.addForm.nom.trim()) this.addFormErrors['nom'] = 'Le nom est obligatoire';
    else if (!/^[a-zA-Z0-9_]{2,}$/.test(this.addForm.nom.trim())) this.addFormErrors['nom'] = 'Lettres, chiffres, underscore (min 2 car.)';
    if (!this.addForm.motDePasse) this.addFormErrors['motDePasse'] = 'Obligatoire';
    else if (this.addForm.motDePasse.length < 6) this.addFormErrors['motDePasse'] = 'Minimum 6 caractères';
    if (!this.addForm.contact.trim()) this.addFormErrors['contact'] = 'Le contact est obligatoire';
    if (this.addForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.addForm.email)) this.addFormErrors['email'] = 'Email invalide';
    return Object.keys(this.addFormErrors).length === 0;
  }

  submitAdd(): void {
    if (!this.validateAddForm() || this.submitting) return;
    this.submitting = true;
    const payload: any = { nom: this.addForm.nom.trim(), motDePasse: this.addForm.motDePasse, contact: this.addForm.contact.trim(), role: this.addForm.role };
    if (this.addForm.email.trim()) payload.email = this.addForm.email.trim();

    this.userService.create(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.showAddModal = false;
        this.successMessage = 'Utilisateur créé avec succès';
        this.page = 1;
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.submitting = false;
        this.addFormErrors['global'] = err?.error?.message || 'Erreur lors de la création';
      }
    });
  }

  // ─── Edit Modal ───
  openEditModal(user: UserItem): void {
    this.selectedUser = user;
    this.editForm = { nom: user.nom, email: user.email ?? '', contact: user.contact, role: user.role, isActive: user.isActive, motDePasse: '' };
    this.editFormErrors = {};
    this.successMessage = '';
    this.showEditModal = true;
  }

  closeEditModal(): void { this.showEditModal = false; this.selectedUser = null; }

  validateEditForm(): boolean {
    this.editFormErrors = {};
    if (!this.editForm.nom.trim()) this.editFormErrors['nom'] = 'Le nom est obligatoire';
    if (!this.editForm.contact.trim()) this.editFormErrors['contact'] = 'Le contact est obligatoire';
    if (this.editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.editForm.email)) this.editFormErrors['email'] = 'Email invalide';
    if (this.editForm.motDePasse && this.editForm.motDePasse.length < 6) this.editFormErrors['motDePasse'] = 'Minimum 6 caractères';
    return Object.keys(this.editFormErrors).length === 0;
  }

  submitEdit(): void {
    if (!this.selectedUser || !this.validateEditForm() || this.submitting) return;
    this.submitting = true;
    const payload: any = { nom: this.editForm.nom.trim(), contact: this.editForm.contact.trim(), role: this.editForm.role, isActive: this.editForm.isActive };
    if (this.editForm.email.trim()) payload.email = this.editForm.email.trim(); else payload.email = '';
    if (this.editForm.motDePasse) payload.motDePasse = this.editForm.motDePasse;

    this.userService.update(this.selectedUser._id, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.showEditModal = false;
        this.selectedUser = null;
        this.successMessage = 'Utilisateur modifié avec succès';
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.submitting = false;
        this.editFormErrors['global'] = err?.error?.message || 'Erreur lors de la modification';
      }
    });
  }

  // ─── Delete Modal ───
  openDeleteModal(user: UserItem): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.selectedUser = null; }

  confirmDelete(): void {
    if (!this.selectedUser || this.deleteSubmitting) return;
    this.deleteSubmitting = true;
    this.userService.delete(this.selectedUser._id).subscribe({
      next: () => {
        this.deleteSubmitting = false;
        this.showDeleteModal = false;
        this.successMessage = 'Utilisateur supprimé avec succès';
        if (this.users.length === 1 && this.page > 1) this.page--;
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err) => {
        this.deleteSubmitting = false;
        this.error = err?.error?.message || 'Erreur lors de la suppression';
        this.showDeleteModal = false;
      }
    });
  }
}
