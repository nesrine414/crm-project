import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, Company, ContactItem } from '../../services/crm-data';
import { exportToCsv } from '../../utils/export-utils';

type TabType = 'contacts' | 'interactions' | 'opportunities';
@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css'
})
export class Clients implements OnInit {
  private crmData = inject(CrmDataService);

  searchTerm = signal('');
  selectedClient = signal<Company | null>(null);
  activeTab = signal<TabType>('contacts');
  sortActive = signal(false);
  sortAsc = signal(true);
  showAddModal = signal(false);
  currentPage = signal(1);
  pageSize = 10;

  // Modèle d'ajout adapté à une Company (Entreprise)
  newClient = {
    name: '',
    sector: '',
    city: '',
    service_provided: '' as 'Recrutement' | 'Formation' | 'Consulting' | '',
    status: 'Client' as 'Client' | 'Lead'
  };
  newInteraction = {
    type: 'Email' as 'Email' | 'Appel' | 'Réunion' | 'Entretien' | 'Visite',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  };
  showAddInteractionForm = signal(false);

  avatarColors = ['#1AACC0', '#6B46E5', '#0D9488', '#B45309', '#DC2626', '#7C3AED'];

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getClients().subscribe({
      next: (companies) => {
        const onlyClientsAndLeads = companies.filter(c => c.status === 'Client' || c.status === 'Lead');
        this.crmData.clients.set(onlyClientsAndLeads);
      },
      error: (err) => console.error("Erreur de chargement Django :", err)
    });

    this.crmData.getInteractions().subscribe({
      next: (data) => this.crmData.interactions.set(data),
      error: (err) => console.error("Erreur de chargement des interactions :", err)
    });
  }

  initialsOf(c: Company): string {
    return (c.name[0] ?? 'C').toUpperCase();
  }

  avatarColorOf(c: Company): string {
    return this.avatarColors[c.id % this.avatarColors.length];
  }

  dealValue(companyId: number): number {
  return this.crmData.opportunities()
    .filter(o => o.company === companyId && o.result === 'Gagné')
    .reduce((sum, o) => sum + o.estimated_amount, 0);
}

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let result = this.crmData.clients().filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.sector ?? '').toLowerCase().includes(term) ||
      (c.service_provided ?? '').toLowerCase().includes(term) ||
      (c.status ?? '').toLowerCase().includes(term) ||
      (c.address ?? '').toLowerCase().includes(term)
    );

    if (this.sortActive()) {
      const asc = this.sortAsc();
      result = [...result].sort((a, b) => {
        if (a.name < b.name) return asc ? -1 : 1;
        if (a.name > b.name) return asc ? 1 : -1;
        return 0;
      });
    }
    return result;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize)));

  pagedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredClients().slice(start, start + this.pageSize);
  });

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  sortBy() {
    if (this.sortActive()) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortActive.set(true);
      this.sortAsc.set(true);
    }
  }

  sortIcon(): string {
    if (!this.sortActive()) return '▾';
    return this.sortAsc() ? '▲' : '▼';
  }

  selectClient(client: Company) {
    this.selectedClient.set(client);
    this.activeTab.set('contacts');
  }

  closeDetail() {
    this.selectedClient.set(null);
  }

  setTab(tab: TabType) {
    this.activeTab.set(tab);
  }

  clientOpportunities = computed(() => {
    const client = this.selectedClient();
    return client ? this.crmData.opportunities().filter(o => o.company === client.id) : [];
  });
  clientInteractions = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    return this.crmData.interactions()
      .filter(i => i.company === client.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  openAddModal() {
    this.newClient = { name: '', sector: '', city: '', service_provided: '', status: 'Client' };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitNewClient() {
    const payload = {
      name: this.newClient.name,
      sector: this.newClient.sector,
      address: this.newClient.city,
      service_provided: this.newClient.service_provided,
      status: this.newClient.status
    };
    this.crmData.addCompany(payload as any).subscribe({
      next: () => {
        this.refreshData();
        this.showAddModal.set(false);
      },
      error: (err) => console.error("Erreur lors de la création de l'entreprise :", err)
    });
  }
  toggleAddInteractionForm() {
    this.showAddInteractionForm.set(!this.showAddInteractionForm());
    this.newInteraction = { type: 'Email', date: new Date().toISOString().slice(0, 10), note: '' };
  }

  submitNewInteraction() {
    const client = this.selectedClient();
    if (!client) return;

    this.crmData.addInteraction({
      company: client.id,
      type: this.newInteraction.type,
      date: this.newInteraction.date,
      note: this.newInteraction.note
    }).subscribe({
      next: () => {
        this.crmData.getInteractions().subscribe(data => this.crmData.interactions.set(data));
        this.showAddInteractionForm.set(false);
      },
      error: (err) => console.error("Erreur lors de l'ajout de l'interaction :", err)
    });
  }

  updateClientService(client: Company, event: Event) {
    const selectElem = event.target as HTMLSelectElement;
    const value = selectElem.value as 'Recrutement' | 'Formation' | 'Consulting' | '';
    this.crmData.updateCompany(client.id, { service_provided: value }).subscribe({
      next: (updated) => {
        this.refreshData();
        this.selectedClient.set({ ...client, service_provided: updated.service_provided });
      },
      error: (err) => console.error("Erreur de mise à jour du service :", err)
    });
  }

  exportToExcel() {
    const today = new Date().toISOString().slice(0, 10);
    const headers = ['Nom de l\'entreprise', 'Secteur d\'activité', 'Service fourni', 'Ville', 'Statut', 'Contacts liés', 'Valeur gagnée (DT)'];
    const rows = this.filteredClients().map(c => [
      c.name,
      c.sector ?? '',
      c.service_provided ?? '',
      c.address ?? '',
      c.status,
      c.contacts?.length ?? 0,
      this.dealValue(c.id) > 0 ? this.dealValue(c.id) : ''
    ]);
    exportToCsv(`Clients_LCA_${today}`, headers, rows);
  }
}