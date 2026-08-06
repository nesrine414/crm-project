import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, NonConformite } from '../../services/crm-data';

@Component({
  selector: 'app-non-conformites',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './non-conformites.html',
  styleUrl: './non-conformites.css'
})
export class NonConformites implements OnInit {
  private crmData = inject(CrmDataService);

  searchTerm = signal('');
  selectedNc = signal<NonConformite | null>(null);
  showAddModal = signal(false);
  showEditModal = signal(false);
  editNc = signal<NonConformite | null>(null);
  editForm: Partial<NonConformite> = {};

  processusLabels: Record<string, string> = {
    PMS: 'Pilotage et Management Stratégique',
    PCS: 'Prestation de Consulting',
    PRT: 'Prestation de Recrutement',
    PFR: 'Prestation de Formation',
    GFS: 'Gestion des Fonctions Support'
  };

  graviteLabels: Record<number, string> = { 1: 'Faible', 2: 'Moyenne', 3: 'Élevée / Majeure' };

  newNc = this.emptyNc();

  ngOnInit() {
    this.refreshData();
  }

  private emptyNc() {
    return {
      numero: 0,
      date: new Date().toISOString().slice(0, 10),
      probleme: '',
      origine: '',
      processus: 'PMS' as NonConformite['processus'],
      gravite: 1 as NonConformite['gravite'],
      action_immediate: '',
      analyse_causes: '',
      recurrence: false,
      action_corrective: '',
      date_prevue: '',
      responsable: '',
      date_realisation: '',
      delais: '',
      efficacite: '' as NonConformite['efficacite'],
      commentaire: '',
      avancement: 'P' as NonConformite['avancement'],
      statut: 'Ouvert' as NonConformite['statut']
    };
  }

  refreshData() {
    this.crmData.getNonConformites().subscribe({
      next: (data) => this.crmData.nonConformites.set(data),
      error: (err) => console.error('Erreur de chargement des non-conformités :', err)
    });
  }

  filteredNcs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.crmData.nonConformites();

    return this.crmData.nonConformites().filter(nc => {
      const ncNum = `nc-${nc.numero}`.toLowerCase();
      const numOnly = `${nc.numero}`;
      const procLabel = (this.processusLabels[nc.processus] ?? '').toLowerCase();
      
      return (
        ncNum.includes(term) ||
        numOnly.includes(term) ||
        nc.probleme.toLowerCase().includes(term) ||
        (nc.origine ?? '').toLowerCase().includes(term) ||
        (nc.responsable ?? '').toLowerCase().includes(term) ||
        nc.processus.toLowerCase().includes(term) ||
        procLabel.includes(term) ||
        (nc.action_corrective ?? '').toLowerCase().includes(term) ||
        (nc.statut ?? '').toLowerCase().includes(term)
      );
    });
  });

  selectNc(nc: NonConformite) {
    this.selectedNc.set(nc);
  }

  closeDetail() {
    this.selectedNc.set(null);
  }

  openAddModal() {
    const maxNumero = this.crmData.nonConformites().reduce((max, nc) => Math.max(max, nc.numero), 0);
    this.newNc = { ...this.emptyNc(), numero: maxNumero + 1 };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitNewNc() {
    this.crmData.addNonConformite(this.newNc).subscribe({
      next: () => {
        this.refreshData();
        this.showAddModal.set(false);
      },
      error: (err) => console.error('Erreur lors de la création de la non-conformité :', err)
    });
  }

  openEditModal(nc: NonConformite, event?: Event) {
    if (event) event.stopPropagation();
    this.editNc.set(nc);
    this.editForm = { ...nc };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editNc.set(null);
  }

  submitEditNc() {
    const current = this.editNc();
    if (!current) return;

    this.crmData.updateNonConformite(current.id, this.editForm).subscribe({
      next: () => {
        this.refreshData();
        if (this.selectedNc()?.id === current.id) {
          this.selectedNc.set({ ...current, ...this.editForm } as NonConformite);
        }
        this.closeEditModal();
      },
      error: (err) => console.error('Erreur de mise à jour de la non-conformité :', err)
    });
  }

  updateStatut(nc: NonConformite, statut: string) {
    this.crmData.updateNonConformite(nc.id, { statut: statut as NonConformite['statut'] }).subscribe({
      next: () => this.refreshData(),
      error: (err) => console.error(err)
    });
  }

  updateAvancement(nc: NonConformite, avancement: string) {
    this.crmData.updateNonConformite(nc.id, { avancement: avancement as NonConformite['avancement'] }).subscribe({
      next: () => this.refreshData(),
      error: (err) => console.error(err)
    });
  }
}