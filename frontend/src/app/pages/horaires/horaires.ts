import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../shared/service/auth.service';
import { BoutiqueService } from '../../shared/service/boutique.service';
import {
  HorairesService,
  HoraireCentre,
  HoraireBoutique,
  ExceptionCentre,
  ExceptionBoutique,
  HorairePayload,
  ExceptionPayload
} from '../../shared/service/horaires.service';

interface CalendarDay {
  date: Date | null;
  dayNum: number | null;
  exception: ExceptionCentre | ExceptionBoutique | null;
  isToday: boolean;
  isCentreFerme: boolean;
}

interface HoraireModal {
  open: boolean;
  jours: string[];
  ferme: boolean;
  heure_ouverture: string;
  heure_fermeture: string;
  saving: boolean;
  error: string;
}

interface ExceptionModal {
  open: boolean;
  mode: 'create' | 'edit';
  exceptionId: string | null;
  dates: string[];
  ferme: boolean;
  heure_ouverture: string;
  heure_fermeture: string;
  motif: string;
  saving: boolean;
  error: string;
}

interface CopyCentreModal {
  open: boolean;
  horaires: HoraireCentre[];
  selectedJours: string[];
  saving: boolean;
  error: string;
}

@Component({
  selector: 'app-horaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horaires.html',
  styleUrl: './horaires.scss'
})
export class HorairesComponent implements OnInit, OnDestroy {
  isAdmin = false;
  isResponsable = false;

  // Responsable only
  selectedBoutiqueId: string = '';

  // Horaires habituels
  horaires: (HoraireCentre | HoraireBoutique)[] = [];

  // Multi-sélection jours tableau
  selectedJours: string[] = [];

  // Exceptions + calendrier
  exceptions: (ExceptionCentre | ExceptionBoutique)[] = [];
  exceptionsCentreDuMois: ExceptionCentre[] = [];
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;
  calendarDays: CalendarDay[] = [];

  // Multi-sélection calendrier
  multiSelectCalendar = false;
  selectedCalendarDates: string[] = [];

  // Pagination exceptions list
  pageExceptions = 1;
  readonly limitExceptions = 5;

  loading = false;
  loadingExceptions = false;
  error = '';
  globalSuccess = '';

  horaireModal: HoraireModal = {
    open: false,
    jours: [],
    ferme: false,
    heure_ouverture: '',
    heure_fermeture: '',
    saving: false,
    error: ''
  };

  exceptionModal: ExceptionModal = {
    open: false,
    mode: 'create',
    exceptionId: null,
    dates: [],
    ferme: false,
    heure_ouverture: '',
    heure_fermeture: '',
    motif: '',
    saving: false,
    error: ''
  };

  copyCentreModal: CopyCentreModal = {
    open: false,
    horaires: [],
    selectedJours: [],
    saving: false,
    error: ''
  };

  private destroy$ = new Subject<void>();

  readonly JOURS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  readonly JOURS_LABELS: Record<string, string> = {
    lundi: 'Lundi',
    mardi: 'Mardi',
    mercredi: 'Mercredi',
    jeudi: 'Jeudi',
    vendredi: 'Vendredi',
    samedi: 'Samedi',
    dimanche: 'Dimanche'
  };

  readonly MOIS_LABELS = [
    '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  constructor(
    private auth: AuthService,
    private boutiqueService: BoutiqueService,
    private horairesService: HorairesService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    this.isResponsable = this.auth.isResponsableBoutique();

    if (this.isAdmin) {
      this.loadAdminData();
    } else if (this.isResponsable) {
      this.loadResponsableData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ──────────────────────────────────────────────────────────
  loadAdminData(): void {
    this.loading = true;
    this.horairesService.getHorairesCentre()
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: horaires => {
          this.horaires = this.sortHoraires(horaires);
          this.loading = false;
          this.loadExceptions();
        },
        error: err => {
          this.error = err?.error?.message || 'Erreur lors du chargement';
          this.loading = false;
        }
      });
  }

  loadResponsableData(): void {
    this.loading = true;
    this.boutiqueService.getMaBoutique().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ boutique }) => {
        if (!boutique) { this.loading = false; return; }
        this.selectedBoutiqueId = boutique._id;
        this.loadBoutiqueHoraires();
      },
      error: err => {
        this.error = err?.error?.message || 'Erreur lors du chargement';
        this.loading = false;
      }
    });
  }

  loadBoutiqueHoraires(): void {
    if (!this.selectedBoutiqueId) return;
    this.loading = true;
    this.horairesService.getHorairesBoutique(this.selectedBoutiqueId)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: horaires => {
          this.horaires = this.sortHoraires(horaires);
          this.loading = false;
          this.loadExceptions();
        },
        error: err => {
          this.error = err?.error?.message || 'Erreur';
          this.loading = false;
        }
      });
  }

  // ── Calendrier ─────────────────────────────────────────────────────────
  loadExceptions(): void {
    this.loadingExceptions = true;
    this.pageExceptions = 1;

    if (this.isAdmin) {
      this.horairesService.getExceptionsCentre(this.currentYear, this.currentMonth)
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: exceptions => {
            this.exceptions = exceptions;
            this.loadingExceptions = false;
            this.buildCalendar();
          },
          error: err => { this.error = err?.error?.message || 'Erreur'; this.loadingExceptions = false; }
        });
    } else if (this.selectedBoutiqueId) {
      this.horairesService.getExceptionsBoutique(this.selectedBoutiqueId, this.currentYear, this.currentMonth)
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: ({ data, exceptionsCentre }) => {
            this.exceptions = data;
            this.exceptionsCentreDuMois = exceptionsCentre;
            this.loadingExceptions = false;
            this.buildCalendar();
          },
          error: err => { this.error = err?.error?.message || 'Erreur'; this.loadingExceptions = false; }
        });
    } else {
      this.loadingExceptions = false;
    }
  }

  buildCalendar(): void {
    const firstDay = new Date(Date.UTC(this.currentYear, this.currentMonth - 1, 1));
    const lastDay = new Date(Date.UTC(this.currentYear, this.currentMonth, 0));
    const today = new Date();

    let startDow = firstDay.getUTCDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const days: CalendarDay[] = [];

    for (let i = 0; i < startDow; i++) {
      days.push({ date: null, dayNum: null, exception: null, isToday: false, isCentreFerme: false });
    }

    for (let d = 1; d <= lastDay.getUTCDate(); d++) {
      const date = new Date(Date.UTC(this.currentYear, this.currentMonth - 1, d));
      const dateStr = date.toISOString().slice(0, 10);

      const exception = this.exceptions.find(e => {
        if (!e.date) return false;
        return new Date(e.date).toISOString().slice(0, 10) === dateStr;
      }) || null;

      const isCentreFerme = this.isResponsable && !exception &&
        this.exceptionsCentreDuMois.some(ec =>
          ec.ferme && new Date(ec.date).toISOString().slice(0, 10) === dateStr
        );

      const isToday = date.getUTCDate() === today.getDate() &&
        date.getUTCMonth() === today.getMonth() &&
        date.getUTCFullYear() === today.getFullYear();

      days.push({ date, dayNum: d, exception, isToday, isCentreFerme });
    }

    this.calendarDays = days;
  }

  prevMonth(): void {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else { this.currentMonth--; }
    this.selectedCalendarDates = [];
    this.loadExceptions();
  }

  nextMonth(): void {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else { this.currentMonth++; }
    this.selectedCalendarDates = [];
    this.loadExceptions();
  }

  // ── Multi-sélection jours tableau ──────────────────────────────────────
  toggleJourSelection(jour: string): void {
    const idx = this.selectedJours.indexOf(jour);
    if (idx === -1) this.selectedJours.push(jour);
    else this.selectedJours.splice(idx, 1);
  }

  isJourSelected(jour: string): boolean {
    return this.selectedJours.includes(jour);
  }

  get editableHoraires(): (HoraireCentre | HoraireBoutique)[] {
    return this.horaires.filter(h => this.canEditHoraire(h));
  }

  get allJoursChecked(): boolean {
    const editable = this.editableHoraires;
    return editable.length > 0 && editable.every(h => this.isJourSelected(h.jour));
  }

  toggleAllJours(): void {
    if (this.allJoursChecked) {
      this.clearJourSelection();
    } else {
      this.selectAllJours();
    }
  }

  selectAllJours(): void {
    this.selectedJours = this.editableHoraires.map(h => h.jour);
  }

  clearJourSelection(): void { this.selectedJours = []; }

  openHoraireModal(horaire: HoraireCentre | HoraireBoutique): void {
    const h = horaire as any;
    this.horaireModal = {
      open: true,
      jours: [h.jour],
      ferme: h.ferme || false,
      heure_ouverture: h.heure_ouverture || '',
      heure_fermeture: h.heure_fermeture || '',
      saving: false,
      error: ''
    };
  }

  openBulkHoraireModal(): void {
    this.horaireModal = {
      open: true,
      jours: [...this.selectedJours],
      ferme: false,
      heure_ouverture: '',
      heure_fermeture: '',
      saving: false,
      error: ''
    };
  }

  saveHoraire(): void {
    const m = this.horaireModal;
    if (!m.ferme && (!m.heure_ouverture || !m.heure_fermeture)) {
      m.error = 'Veuillez saisir les heures d\'ouverture et fermeture';
      return;
    }
    m.saving = true;
    m.error = '';

    const payload: HorairePayload = {
      ferme: m.ferme,
      heure_ouverture: m.ferme ? null : m.heure_ouverture,
      heure_fermeture: m.ferme ? null : m.heure_fermeture
    };

    const calls = m.jours.map(jour =>
      this.isAdmin
        ? this.horairesService.upsertHoraireCentre(jour, payload)
        : this.horairesService.upsertHoraireBoutique(this.selectedBoutiqueId, jour, payload)
    );

    forkJoin(calls).pipe(takeUntil(this.destroy$)).subscribe({
      next: results => {
        results.forEach(updated => {
          const upd = updated as any;
          const idx = this.horaires.findIndex(h => h.jour === upd.jour);
          if (idx !== -1) {
            this.horaires[idx] = { ...this.horaires[idx], ...upd };
          } else {
            this.horaires.push(upd);
          }
        });
        this.horaires = this.sortHoraires(this.horaires);
        m.saving = false;
        m.open = false;
        this.clearJourSelection();
        this.showSuccess(m.jours.length > 1
          ? `${m.jours.length} horaires mis à jour`
          : 'Horaire mis à jour');
      },
      error: err => {
        m.saving = false;
        m.error = err?.error?.message || 'Erreur lors de la sauvegarde';
      }
    });
  }

  // ── Multi-sélection calendrier ─────────────────────────────────────────
  toggleMultiSelectCalendar(): void {
    this.multiSelectCalendar = !this.multiSelectCalendar;
    this.selectedCalendarDates = [];
  }

  isCalendarDateSelected(day: CalendarDay): boolean {
    if (!day.date) return false;
    return this.selectedCalendarDates.includes(day.date.toISOString().slice(0, 10));
  }

  // ── Modal exception ────────────────────────────────────────────────────
  onCalendarDayClick(day: CalendarDay): void {
    if (!day.date) return;
    const dateStr = day.date.toISOString().slice(0, 10);

    if (this.multiSelectCalendar) {
      const idx = this.selectedCalendarDates.indexOf(dateStr);
      if (idx === -1) this.selectedCalendarDates.push(dateStr);
      else this.selectedCalendarDates.splice(idx, 1);
      return;
    }

    if (day.exception) {
      const ex = day.exception as any;
      if (ex.fermePar === 'centre' && !ex._id) return;
      this.openExceptionModal('edit', day.date, day.exception);
    } else if (!day.isCentreFerme) {
      this.openExceptionModal('create', day.date, null);
    }
  }

  openExceptionModal(mode: 'create' | 'edit', date: Date, exception: ExceptionCentre | ExceptionBoutique | null): void {
    const ex = exception as any;
    this.exceptionModal = {
      open: true,
      mode,
      exceptionId: ex?._id || null,
      dates: [date.toISOString().slice(0, 10)],
      ferme: ex?.ferme ?? false,
      heure_ouverture: ex?.heure_ouverture || '',
      heure_fermeture: ex?.heure_fermeture || '',
      motif: ex?.motif || '',
      saving: false,
      error: ''
    };
  }

  openBulkExceptionModal(): void {
    this.exceptionModal = {
      open: true,
      mode: 'create',
      exceptionId: null,
      dates: [...this.selectedCalendarDates],
      ferme: false,
      heure_ouverture: '',
      heure_fermeture: '',
      motif: '',
      saving: false,
      error: ''
    };
  }

  get exceptionModalDateLabel(): string {
    const m = this.exceptionModal;
    if (m.dates.length === 1) return m.dates[0];
    return `${m.dates.length} dates sélectionnées`;
  }

  saveException(): void {
    const m = this.exceptionModal;
    if (!m.ferme && (!m.heure_ouverture || !m.heure_fermeture)) {
      m.error = 'Veuillez saisir les heures ou cocher "Fermé"';
      return;
    }
    m.saving = true;
    m.error = '';

    if (m.mode === 'create') {
      const calls = m.dates.map(dateStr => {
        const payload: ExceptionPayload = {
          date: dateStr,
          ferme: m.ferme,
          heure_ouverture: m.ferme ? null : m.heure_ouverture,
          heure_fermeture: m.ferme ? null : m.heure_fermeture,
          motif: m.motif || null
        };
        return this.isAdmin
          ? this.horairesService.createExceptionCentre(payload)
          : this.horairesService.createExceptionBoutique(this.selectedBoutiqueId, payload);
      });

      forkJoin(calls).pipe(takeUntil(this.destroy$)).subscribe({
        next: newExceptions => {
          newExceptions.forEach(ex => this.exceptions.push(ex as any));
          this.buildCalendar();
          m.saving = false;
          m.open = false;
          this.selectedCalendarDates = [];
          this.showSuccess(m.dates.length > 1
            ? `${m.dates.length} exceptions créées`
            : 'Exception créée');
        },
        error: err => { m.saving = false; m.error = err?.error?.message || 'Erreur'; }
      });
    } else {
      const payload = {
        ferme: m.ferme,
        heure_ouverture: m.ferme ? null : m.heure_ouverture,
        heure_fermeture: m.ferme ? null : m.heure_fermeture,
        motif: m.motif || null
      };
      const obs = this.isAdmin
        ? this.horairesService.updateExceptionCentre(m.exceptionId!, payload)
        : this.horairesService.updateExceptionBoutique(this.selectedBoutiqueId, m.exceptionId!, payload);

      obs.pipe(takeUntil(this.destroy$)).subscribe({
        next: updated => {
          const idx = this.exceptions.findIndex(e => (e as any)._id === m.exceptionId);
          if (idx !== -1) this.exceptions[idx] = updated as any;
          this.buildCalendar();
          m.saving = false;
          m.open = false;
          this.showSuccess('Exception mise à jour');
        },
        error: err => { m.saving = false; m.error = err?.error?.message || 'Erreur'; }
      });
    }
  }

  deleteException(exception: ExceptionCentre | ExceptionBoutique): void {
    const ex = exception as any;
    if (!ex._id) return;
    if (!confirm('Supprimer cette exception ?')) return;

    const obs = this.isAdmin
      ? this.horairesService.deleteExceptionCentre(ex._id)
      : this.horairesService.deleteExceptionBoutique(this.selectedBoutiqueId, ex._id);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.exceptions = this.exceptions.filter(e => (e as any)._id !== ex._id);
        this.buildCalendar();
        this.showSuccess('Exception supprimée');
      },
      error: err => { this.error = err?.error?.message || 'Erreur lors de la suppression'; }
    });
  }

  // ── Copy centre → boutique (responsable) ────────────────────────────────
  openCopyCentreModal(): void {
    this.copyCentreModal = { open: false, horaires: [], selectedJours: [], saving: false, error: '' };
    this.horairesService.getHorairesCentre()
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: horaires => {
          this.copyCentreModal = {
            open: true,
            horaires,
            selectedJours: horaires.map(h => h.jour),
            saving: false,
            error: ''
          };
        },
        error: err => { this.error = err?.error?.message || 'Erreur lors du chargement des horaires du centre'; }
      });
  }

  toggleCopyCentreJour(jour: string): void {
    const idx = this.copyCentreModal.selectedJours.indexOf(jour);
    if (idx === -1) this.copyCentreModal.selectedJours.push(jour);
    else this.copyCentreModal.selectedJours.splice(idx, 1);
  }

  isCopyCentreJourSelected(jour: string): boolean {
    return this.copyCentreModal.selectedJours.includes(jour);
  }

  applyCentreHoraires(): void {
    const m = this.copyCentreModal;
    if (m.selectedJours.length === 0) {
      m.error = 'Sélectionnez au moins un jour';
      return;
    }
    m.saving = true;
    m.error = '';

    const calls = m.selectedJours.map(jour => {
      const src = m.horaires.find(h => h.jour === jour)!;
      return this.horairesService.upsertHoraireBoutique(this.selectedBoutiqueId, jour, {
        ferme: src.ferme,
        heure_ouverture: src.heure_ouverture,
        heure_fermeture: src.heure_fermeture
      });
    });

    forkJoin(calls).pipe(takeUntil(this.destroy$)).subscribe({
      next: results => {
        results.forEach(updated => {
          const upd = updated as any;
          const idx = this.horaires.findIndex(h => h.jour === upd.jour);
          if (idx !== -1) this.horaires[idx] = { ...this.horaires[idx], ...upd };
          else this.horaires.push(upd);
        });
        this.horaires = this.sortHoraires(this.horaires);
        m.saving = false;
        m.open = false;
        this.showSuccess(`${m.selectedJours.length} horaire(s) copiés depuis le centre`);
      },
      error: err => {
        m.saving = false;
        m.error = err?.error?.message || 'Erreur lors de l\'application';
      }
    });
  }

  // ── Pagination exceptions ──────────────────────────────────────────────
  get paginatedExceptions(): (ExceptionCentre | ExceptionBoutique)[] {
    const start = (this.pageExceptions - 1) * this.limitExceptions;
    return this.exceptions.slice(start, start + this.limitExceptions);
  }

  get totalPagesExceptions(): number {
    return Math.ceil(this.exceptions.length / this.limitExceptions);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  getDayClass(day: CalendarDay): string {
    if (!day.date) return 'cal-empty';
    if (day.isCentreFerme) return 'cal-day centre-ferme';
    if (!day.exception) return 'cal-day';
    const ex = day.exception as any;
    return ex.ferme ? 'cal-day day-ferme' : 'cal-day day-modifie';
  }

  getExDateStr(ex: ExceptionCentre | ExceptionBoutique): string {
    return new Date(ex.date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
  }

  canEditHoraire(h: HoraireCentre | HoraireBoutique): boolean {
    if (this.isAdmin) return true;
    const hh = h as HoraireBoutique;
    return hh.fermePar !== 'centre';
  }

  get pageTitle(): string {
    if (this.isAdmin) return 'Centre commercial';
    return 'Ma Boutique';
  }

  private sortHoraires(horaires: (HoraireCentre | HoraireBoutique)[]): (HoraireCentre | HoraireBoutique)[] {
    return [...horaires].sort((a, b) =>
      this.JOURS_ORDER.indexOf(a.jour) - this.JOURS_ORDER.indexOf(b.jour)
    );
  }

  private showSuccess(msg: string): void {
    this.globalSuccess = msg;
    setTimeout(() => this.globalSuccess = '', 3000);
  }
}
