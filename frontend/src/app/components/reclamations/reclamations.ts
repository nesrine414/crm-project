import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, Reclamation, Company } from '../../services/crm-data';

interface NewReclamationForm {
  company: number | null;
  subject: string;
  description: string;
  status: Reclamation['status'];
  priority: Reclamation['priority'];
  channel: Reclamation['channel'];
}

@Component({
  selector: 'app-reclamations',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reclamations.html',
  styleUrl: './reclamations.css'
})
export class Reclamations implements OnInit {
  crmData = inject(CrmDataService);

  searchTerm = '';
  selectedReclamation = signal<Reclamation | null>(null);
  showAddModal = signal(false);

  // Signal local, indépendant de celui de la page Clients
  companies = signal<Company[]>([]);

  newReclamation: NewReclamationForm = {
    company: null,
    subject: '',
    description: '',
    status: 'Ouverte',
    priority: 'Moyenne',
    channel: 'Email'
  };

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getReclamations().subscribe({
      next: (recs) => this.crmData.reclamations.set(recs),
      error: (err) => console.error(err)
    });
    this.crmData.getClients().subscribe({
      next: (comps) => this.companies.set(comps.filter(c => c.status === 'Client')),
      error: (err) => console.error(err)
    });
  }

  getCompanyName(companyId: number): string {
    const comp = this.companies().find(c => c.id === companyId);
    return comp ? comp.name : 'Structure anonyme';
  }

  filteredReclamations = computed(() => {
    const term = this.searchTerm.toLowerCase();
    return this.crmData.reclamations().filter(r =>
      r.subject.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      this.getCompanyName(r.company).toLowerCase().includes(term)
    );
  });

  updateStatus(rec: Reclamation, newStatus: Reclamation['status']) {
    this.crmData.updateReclamationStatus(rec.id, newStatus).subscribe({
      next: () => this.refreshData()
    });
  }

  selectReclamation(rec: Reclamation) {
    this.selectedReclamation.set(rec);
  }

  closeDetail() {
    this.selectedReclamation.set(null);
  }

  openAddModal() {
    this.newReclamation = {
      company: null,
      subject: '',
      description: '',
      status: 'Ouverte',
      priority: 'Moyenne',
      channel: 'Email'
    };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitReclamation() {
    if (!this.newReclamation.company) return;

    const payload = {
      company: this.newReclamation.company,
      subject: this.newReclamation.subject,
      description: this.newReclamation.description,
      status: this.newReclamation.status,
      priority: this.newReclamation.priority,
      channel: this.newReclamation.channel
    };

    this.crmData.addReclamation(payload).subscribe({
      next: () => {
        this.refreshData();
        this.showAddModal.set(false);
      },
      error: (err) => console.error(err)
    });
  }
}