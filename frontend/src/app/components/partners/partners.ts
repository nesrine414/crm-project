import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { CrmDataService, Company, ContactItem } from '../../services/crm-data';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partners.html',
  styleUrl: './partners.css'
})
export class Partners implements OnInit {
  private crmData = inject(CrmDataService);

  searchTerm = '';
  selectedPartner = signal<Company | null>(null);
  sortActive = signal(false);
  sortAsc = signal(true);
  showAddModal = signal(false);
  currentPage = signal(1);
  pageSize = 10;

  // ---- Ajout ----
  newPartner = {
    name: '',
    sector: '',
    address: '',
    country: '',
    collaboration_type: '',
    is_retained: false,
    status: 'Partenaire' as const
  };
  newPartnerContacts = signal<Omit<ContactItem, 'id'>[]>([]);

  // ---- Édition ----
  editMode = signal(false);
  editPartner = {
    name: '',
    country: '',
    collaboration_type: '',
    is_retained: false
  };
  editContacts = signal<ContactItem[]>([]);
  private removedContactIds: number[] = [];

  avatarColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getClients().subscribe({
      next: (companies) => {
        const onlyPartners = companies.filter(c => c.status === 'Partenaire');
        this.crmData.partners.set(onlyPartners);
      },
      error: (err) => console.error(err)
    });
  }

  initialsOf(p: Company): string {
    return (p.name[0] ?? 'P').toUpperCase();
  }

  avatarColorOf(p: Company): string {
    return this.avatarColors[p.id % this.avatarColors.length];
  }

  filteredPartners = computed(() => {
    const term = this.searchTerm.toLowerCase();
    let result = this.crmData.partners().filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.country ?? '').toLowerCase().includes(term) ||
      (p.collaboration_type ?? '').toLowerCase().includes(term)
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

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPartners().length / this.pageSize)));

  pagedPartners = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredPartners().slice(start, start + this.pageSize);
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

  selectPartner(partner: Company) {
    this.selectedPartner.set(partner);
  }

  closeDetail() {
    this.selectedPartner.set(null);
    this.editMode.set(false);
  }
  editFromRow(partner: Company, event: Event) {
    event.stopPropagation();
    this.selectedPartner.set(partner);
    this.openEditMode(partner);
  }

  deleteFromRow(partner: Company, event: Event) {
    event.stopPropagation();
    const confirmed = confirm(`Supprimer définitivement le partenaire "${partner.name}" ?`);
    if (!confirmed) return;

    this.crmData.deleteCompany(partner.id).subscribe({
      next: () => this.refreshData(),
      error: (err) => console.error(err)
    });
  }

  // ---- Ajout de partenaire ----
  openAddModal() {
    this.newPartner = {
      name: '', sector: '', address: '', country: '',
      collaboration_type: '', is_retained: false, status: 'Partenaire'
    };
    this.newPartnerContacts.set([]);
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  addNewContactField() {
    this.newPartnerContacts.update(list => [
      ...list,
      { first_name: '', last_name: '', email: '', phone: '' }
    ]);
  }

  removeNewContactField(index: number) {
    this.newPartnerContacts.update(list => list.filter((_, i) => i !== index));
  }

  submitNewPartner() {
    this.crmData.addCompany(this.newPartner).subscribe({
      next: (created) => {
        const contacts = this.newPartnerContacts().filter(c => c.first_name || c.last_name || c.email);

        if (contacts.length === 0) {
          this.refreshData();
          this.showAddModal.set(false);
          return;
        }

        const requests = contacts.map(c => this.crmData.addContact(created.id, c));
        forkJoin(requests).subscribe({
          next: () => {
            this.refreshData();
            this.showAddModal.set(false);
          },
          error: (err) => console.error(err)
        });
      },
      error: (err) => console.error(err)
    });
  }

  // ---- Édition de partenaire ----
  openEditMode(partner: Company) {
    this.editPartner = {
      name: partner.name,
      country: partner.country || '',
      collaboration_type: partner.collaboration_type || '',
      is_retained: partner.is_retained || false
    };
    this.editContacts.set(partner.contacts.map(c => ({ ...c })));
    this.removedContactIds = [];
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
  }

  addEditContact() {
    this.editContacts.update(list => [
      ...list,
      { first_name: '', last_name: '', email: '', phone: '' }
    ]);
  }

  removeEditContact(index: number) {
    const contact = this.editContacts()[index];
    if (contact.id) {
      this.removedContactIds.push(contact.id);
    }
    this.editContacts.update(list => list.filter((_, i) => i !== index));
  }

  saveEdit() {
    const partner = this.selectedPartner();
    if (!partner) return;

    this.crmData.updateCompany(partner.id, this.editPartner).subscribe({
      next: () => {
        const requests: Observable<any>[] = [];

        this.removedContactIds.forEach(id => {
          requests.push(this.crmData.deleteContact(id));
        });

        this.editContacts().forEach(c => {
          if (c.id) {
            requests.push(this.crmData.updateContact(c.id, c));
          } else if (c.first_name || c.last_name || c.email) {
            requests.push(this.crmData.addContact(partner.id, c));
          }
        });

        if (requests.length === 0) {
          this.finishEdit();
          return;
        }

        forkJoin(requests).subscribe({
          next: () => this.finishEdit(),
          error: (err) => console.error(err)
        });
      },
      error: (err) => console.error(err)
    });
  }

  private finishEdit() {
    this.refreshData();
    this.editMode.set(false);
    this.selectedPartner.set(null);
  }
}