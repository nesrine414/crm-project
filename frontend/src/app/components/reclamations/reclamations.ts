import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe } from '@angular/common';
import { CrmDataService, Reclamation, Company, UserItem } from '../../services/crm-data';
import { exportToCsv } from '../../utils/export-utils';

interface ReclamationForm {
  company: number | null;
  subject: string;
  description: string;
  plan_action: string;
  status: Reclamation['status'];
  priority: Reclamation['priority'];
  channel: Reclamation['channel'];
  assigned_to: number | null;
}

@Component({
  selector: 'app-reclamations',
  standalone: true,
  imports: [FormsModule, NgClass, SlicePipe],
  templateUrl: './reclamations.html',
  styleUrl: './reclamations.css'
})
export class Reclamations implements OnInit {
  crmData = inject(CrmDataService);

  searchTerm = signal('');
  selectedReclamation = signal<Reclamation | null>(null);
  showAddModal = signal(false);
  editMode = signal(false);
  editingId: number | null = null;

  companies = signal<Company[]>([]);
  users = signal<UserItem[]>([]);

  form: ReclamationForm = this.emptyForm();

  ngOnInit() {
    this.refreshData();
  }

  emptyForm(): ReclamationForm {
    return {
      company: null,
      subject: '',
      description: '',
      plan_action: '',
      status: 'Ouverte',
      priority: 'Moyenne',
      channel: 'Email',
      assigned_to: null
    };
  }

  refreshData() {
    this.crmData.getReclamations().subscribe({
      next: (recs) => this.crmData.reclamations.set(recs),
      error: (err) => console.error(err)
    });
    this.crmData.getClients().subscribe({
      next: (comps) => this.companies.set(comps),
      error: (err) => console.error(err)
    });
    this.crmData.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => console.error(err)
    });
  }

  getCompanyName(companyId: number): string {
    const comp = this.companies().find(c => c.id === companyId);
    return comp ? comp.name : '—';
  }

  getUserName(userId: number | null | undefined): string {
    if (!userId) return '—';
    const u = this.users().find(u => u.id === userId);
    if (!u) return '—';
    const name = `${u.first_name} ${u.last_name}`.trim();
    return name || u.username;
  }

  filteredReclamations = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.crmData.reclamations().filter(r =>
      (r.number || '').toLowerCase().includes(term) ||
      r.subject.toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      this.getCompanyName(r.company).toLowerCase().includes(term) ||
      (r.assigned_to_name || '').toLowerCase().includes(term)
    );
  });

  statusClass(status: string): string {
    if (status === 'Ouverte') return 'badge-ouverte';
    if (status === 'En cours') return 'badge-encours';
    return 'badge-resolue';
  }

  priorityClass(priority: string): string {
    if (priority === 'Élevée') return 'badge-high';
    if (priority === 'Moyenne') return 'badge-med';
    return 'badge-low';
  }

  selectReclamation(rec: Reclamation) {
    this.selectedReclamation.set(rec);
  }

  closeDetail() {
    this.selectedReclamation.set(null);
  }

  openAddModal() {
    this.editMode.set(false);
    this.editingId = null;
    this.form = this.emptyForm();
    this.showAddModal.set(true);
  }

  openEditModal(rec: Reclamation) {
    this.editMode.set(true);
    this.editingId = rec.id;
    this.form = {
      company: rec.company,
      subject: rec.subject,
      description: rec.description,
      plan_action: rec.plan_action || '',
      status: rec.status,
      priority: rec.priority,
      channel: rec.channel,
      assigned_to: rec.assigned_to || null
    };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitReclamation() {
    if (!this.form.company || !this.form.subject.trim()) return;

    const payload: any = {
      company: this.form.company,
      subject: this.form.subject,
      description: this.form.description,
      plan_action: this.form.plan_action,
      status: this.form.status,
      priority: this.form.priority,
      channel: this.form.channel,
      assigned_to: this.form.assigned_to || null
    };

    if (this.editMode() && this.editingId) {
      this.crmData.updateReclamation(this.editingId, payload).subscribe({
        next: () => { this.refreshData(); this.showAddModal.set(false); },
        error: (err) => console.error(err)
      });
    } else {
      this.crmData.addReclamation(payload).subscribe({
        next: () => { this.refreshData(); this.showAddModal.set(false); },
        error: (err) => console.error(err)
      });
    }
  }

  deleteReclamation(id: number) {
    if (!confirm('Supprimer cette réclamation ?')) return;
    this.crmData.deleteReclamation(id).subscribe({
      next: () => this.refreshData(),
      error: (err) => console.error(err)
    });
  }

  exportToExcel() {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      'N° Ticket', 'Objet', 'Client', 'Canal',
      'Priorité', 'Statut', 'Responsable', 'Plan d\'action', 'Date de création'
    ];
    const rows = this.filteredReclamations().map(r => [
      r.number || `#${r.id}`,
      r.subject,
      this.getCompanyName(r.company),
      r.channel,
      r.priority,
      r.status,
      r.assigned_to_name || this.getUserName(r.assigned_to),
      r.plan_action || '',
      r.created_at ? r.created_at.slice(0, 10) : ''
    ]);
    exportToCsv(`Reclamations_LCA_${today}`, headers, rows);
  }
}