import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, Company } from '../../services/crm-data';

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

  newPartner = {
  name: '',
  sector: '',
  address: '',
  status: 'Partenaire' as const
};

  avatarColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getClients().subscribe({
      next: (companies) => {
        // Un partenaire est une Company avec le statut 'Partenaire'
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
      (p.sector ?? '').toLowerCase().includes(term) ||
      (p.address ?? '').toLowerCase().includes(term)
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
  }

  openAddModal() {
  this.newPartner = { name: '', sector: '', address: '', status: 'Partenaire' };
  this.showAddModal.set(true);
}

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitNewPartner() {
    this.crmData.addCompany(this.newPartner).subscribe({
      next: () => {
        this.refreshData();
        this.showAddModal.set(false);
      },
      error: (err) => console.error(err)
    });
  }
}