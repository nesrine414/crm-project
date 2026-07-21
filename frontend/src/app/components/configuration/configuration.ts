import { Component, signal, inject, OnInit } from '@angular/core';
import { CrmDataService, UserItem } from '../../services/crm-data';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [],
  templateUrl: './configuration.html',
  styleUrl: './configuration.css'
})
export class Configuration implements OnInit {
  private crmData = inject(CrmDataService);

  users = signal<UserItem[]>([]);

  ngOnInit() {
    this.crmData.getUsers().subscribe({
      next: (data) => this.users.set(data.filter(u => u.username !== 'admin')),
      error: (err) => console.error(err)
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Jamais connectée';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
