import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfficheService, DemandeAffiche, AfficheConfig } from '../../shared/service/affiche.service';

@Component({
  selector: 'app-affiches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './affiches.html',
  styleUrl: './affiches.scss'
})
export class AffichesComponent implements OnInit {

  activeTab: 'demandes' | 'affiche' = 'demandes';

  // ── Demandes ──────────────────────────────────────────────────
  demandes: DemandeAffiche[] = [];
  demandesLoading = false;
  demandesError = '';
  demandesTotal = 0;
  demandesPage = 1;
  readonly demandesLimit = 15;
  filterStatut = 'en_attente';

  // ── À l'affiche ───────────────────────────────────────────────
  afficheProduits: DemandeAffiche[] = [];
  afficheLoading = false;
  afficheError = '';
  afficheSuccess = '';
  afficheDirty = false;

  // ── Modals ────────────────────────────────────────────────────
  acceptModal: { open: boolean; demande: DemandeAffiche | null; ordre: number | null; loading: boolean; error: string } = {
    open: false, demande: null, ordre: null, loading: false, error: ''
  };
  refusModal: { open: boolean; demande: DemandeAffiche | null; motif: string; loading: boolean; error: string } = {
    open: false, demande: null, motif: '', loading: false, error: ''
  };
  retirerModal: { open: boolean; demande: DemandeAffiche | null; loading: boolean } = {
    open: false, demande: null, loading: false
  };

  // ── Config ────────────────────────────────────────────────────
  config: AfficheConfig = { delaiResoumissionAffiche: 7, maxProduitsAffiche: 10 };
  configLoading = false;
  configSuccess = '';
  configError = '';
  configInput = 7;
  configInputMax = 10;

  constructor(private afficheService: AfficheService) {}

  ngOnInit(): void {
    this.loadDemandes();
    this.loadAffiche();
    this.loadConfig();
  }

  // ── Demandes ──────────────────────────────────────────────────
  loadDemandes(): void {
    this.demandesLoading = true;
    this.demandesError = '';
    this.afficheService.getDemandesAdmin({
      statut: this.filterStatut || undefined,
      page: this.demandesPage,
      limit: this.demandesLimit
    }).subscribe({
      next: (res) => {
        this.demandes = res.data;
        this.demandesTotal = res.total;
        this.demandesLoading = false;
      },
      error: (err) => {
        this.demandesError = err?.error?.message ?? 'Erreur lors du chargement des demandes.';
        this.demandesLoading = false;
      }
    });
  }

  get demandesPages(): number {
    return Math.max(1, Math.ceil(this.demandesTotal / this.demandesLimit));
  }

  goToDemandesPage(p: number): void {
    if (p < 1 || p > this.demandesPages) return;
    this.demandesPage = p;
    this.loadDemandes();
  }

  onFilterStatutChange(): void {
    this.demandesPage = 1;
    this.loadDemandes();
  }

  // ── Accept/Refuse modals ──────────────────────────────────────
  openAcceptModal(d: DemandeAffiche): void {
    this.acceptModal = { open: true, demande: d, ordre: null, loading: false, error: '' };
  }

  closeAcceptModal(): void {
    if (this.acceptModal.loading) return;
    this.acceptModal.open = false;
  }

  confirmAccept(): void {
    if (!this.acceptModal.demande) return;
    this.acceptModal.loading = true;
    this.acceptModal.error = '';
    this.afficheService.accepterDemande(this.acceptModal.demande._id, this.acceptModal.ordre ?? undefined).subscribe({
      next: () => {
        this.acceptModal.open = false;
        this.acceptModal.loading = false;
        this.loadDemandes();
        this.loadAffiche();
      },
      error: (err) => {
        this.acceptModal.error = err?.error?.message ?? 'Erreur lors de l\'acceptation.';
        this.acceptModal.loading = false;
      }
    });
  }

  openRefusModal(d: DemandeAffiche): void {
    this.refusModal = { open: true, demande: d, motif: '', loading: false, error: '' };
  }

  closeRefusModal(): void {
    if (this.refusModal.loading) return;
    this.refusModal.open = false;
  }

  confirmRefus(): void {
    if (!this.refusModal.demande) return;
    this.refusModal.loading = true;
    this.refusModal.error = '';
    this.afficheService.refuserDemande(this.refusModal.demande._id, this.refusModal.motif || undefined).subscribe({
      next: () => {
        this.refusModal.open = false;
        this.refusModal.loading = false;
        this.loadDemandes();
      },
      error: (err) => {
        this.refusModal.error = err?.error?.message ?? 'Erreur lors du refus.';
        this.refusModal.loading = false;
      }
    });
  }

  // ── À l'affiche ───────────────────────────────────────────────
  loadAffiche(): void {
    this.afficheLoading = true;
    this.afficheError = '';
    this.afficheService.getProduitAffiches().subscribe({
      next: (list) => {
        this.afficheProduits = list;
        this.afficheDirty = false;
        this.afficheLoading = false;
      },
      error: (err) => {
        this.afficheError = err?.error?.message ?? 'Erreur lors du chargement.';
        this.afficheLoading = false;
      }
    });
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const arr = [...this.afficheProduits];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    this.afficheProduits = arr;
    this.afficheDirty = true;
  }

  moveDown(index: number): void {
    if (index >= this.afficheProduits.length - 1) return;
    const arr = [...this.afficheProduits];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    this.afficheProduits = arr;
    this.afficheDirty = true;
  }

  saveOrder(): void {
    this.afficheLoading = true;
    const ordre = this.afficheProduits.map((d, i) => ({ demandeId: d._id, ordre: i + 1 }));
    this.afficheService.reorderAffiches(ordre).subscribe({
      next: () => {
        this.afficheDirty = false;
        this.afficheLoading = false;
        this.afficheSuccess = 'Ordre sauvegardé.';
        setTimeout(() => { this.afficheSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.afficheError = err?.error?.message ?? 'Erreur lors de la sauvegarde.';
        this.afficheLoading = false;
      }
    });
  }

  openRetirerModal(d: DemandeAffiche): void {
    this.retirerModal = { open: true, demande: d, loading: false };
  }

  closeRetirerModal(): void {
    if (this.retirerModal.loading) return;
    this.retirerModal.open = false;
  }

  confirmRetirer(): void {
    if (!this.retirerModal.demande) return;
    this.retirerModal.loading = true;
    this.afficheService.retirerAffiche(this.retirerModal.demande._id).subscribe({
      next: () => {
        this.retirerModal.open = false;
        this.retirerModal.loading = false;
        this.loadAffiche();
      },
      error: () => {
        this.retirerModal.loading = false;
      }
    });
  }

  // ── Config ────────────────────────────────────────────────────
  loadConfig(): void {
    this.afficheService.getConfig().subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.configInput = cfg.delaiResoumissionAffiche;
        this.configInputMax = cfg.maxProduitsAffiche;
      },
      error: () => {}
    });
  }

  saveConfig(): void {
    this.configLoading = true;
    this.configError = '';
    this.afficheService.updateConfig({ delaiResoumissionAffiche: this.configInput, maxProduitsAffiche: this.configInputMax }).subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.configInput = cfg.delaiResoumissionAffiche;
        this.configInputMax = cfg.maxProduitsAffiche;
        this.configLoading = false;
        this.configSuccess = 'Configuration mise à jour.';
        setTimeout(() => { this.configSuccess = ''; }, 3000);
      },
      error: (err) => {
        this.configError = err?.error?.message ?? 'Erreur lors de la mise à jour.';
        this.configLoading = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatPrix(n: number | undefined | null): string {
    if (n == null) return '—';
    return n.toLocaleString('fr-FR') + ' Ar';
  }

  statutLabel(s: string): string {
    switch (s) {
      case 'en_attente': return 'En attente';
      case 'accepte': return 'Accepté';
      case 'refuse': return 'Refusé';
      default: return s;
    }
  }

  get pagesArray(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.demandesPage - 2);
    const end = Math.min(this.demandesPages, this.demandesPage + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }
}
