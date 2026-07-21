import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CrmDataService } from '../../services/crm-data';

interface ActivityItem {
  id: string;
  type: 'opportunity' | 'reclamation';
  title: string;
  description: string;
  date: string;
  rawDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  crmData = inject(CrmDataService);
  recentActivities = signal<ActivityItem[]>([]);

  stats = computed(() => {
    const comps = this.crmData.clients();
    const opps = this.crmData.opportunities();

    const activeOpps = opps.filter(o => o.result === 'En cours');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + Number(o.estimated_amount || 0), 0);

    const wonOpps = opps.filter(o => o.result === 'Gagné');
    const totalRevenue = wonOpps.reduce((sum, o) => sum + Number(o.estimated_amount || 0), 0);

    return {
      clientCount: comps.filter(c => c.status === 'Client').length,
      pipelineValue: totalPipeline,
      totalRevenue: totalRevenue
    };
  });

  npsScore = computed(() => {
    const list = this.crmData.feedbacks();
    if (list.length === 0) return null;
    const promoters = list.filter(f => f.rating === 5).length;
    const detractors = list.filter(f => f.rating <= 3).length;
    return Math.round(((promoters - detractors) / list.length) * 100);
  });

  monthlyPipeline = computed(() => {
    const opps = this.crmData.opportunities();
    const buckets = new Map<string, { label: string; total: number; sortKey: string }>();

    for (const opp of opps) {
      if (!opp.entry_date) continue;
      const d = new Date(opp.entry_date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

      const existing = buckets.get(sortKey);
      const amount = Number(opp.estimated_amount || 0);
      if (existing) {
        existing.total += amount;
      } else {
        buckets.set(sortKey, { label, total: amount, sortKey });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const last6 = sorted.slice(-6);
    const max = Math.max(...last6.map(b => b.total), 1);

    return last6.map(b => ({ ...b, pct: Math.round((b.total / max) * 100) }));
  });

  topClients = computed(() => {
    const opps = this.crmData.opportunities().filter(o => o.result === 'Gagné');
    const totals = new Map<number, number>();

    for (const opp of opps) {
      totals.set(opp.company, (totals.get(opp.company) ?? 0) + Number(opp.estimated_amount || 0));
    }

    const ranked = Array.from(totals.entries())
      .map(([companyId, total]) => ({ name: this.getCompanyName(companyId), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const max = Math.max(...ranked.map(r => r.total), 1);
    return ranked.map(r => ({ ...r, pct: Math.round((r.total / max) * 100) }));
  });

  ngOnInit() {
    this.crmData.getClients().subscribe({
      next: (data) => {
        this.crmData.clients.set(data);
        this.loadRecentActivities();
      },
      error: (err) => console.error(err)
    });

    this.crmData.getOpportunities().subscribe({
      next: (data) => {
        this.crmData.opportunities.set(data);
        this.loadRecentActivities();
      },
      error: (err) => console.error(err)
    });

    this.crmData.getReclamations().subscribe({
      next: (data) => {
        this.crmData.reclamations.set(data);
        this.loadRecentActivities();
      },
      error: (err) => console.error(err)
    });
    this.crmData.getFeedbacks().subscribe({
      next: (data) => {
        this.crmData.feedbacks.set(data);
      },
      error: (err) => console.error(err)
    });
  }

  private getCompanyName(companyId: number): string {
    const comp = this.crmData.clients().find(c => c.id === companyId);
    return comp ? comp.name : 'Structure inconnue';
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Récemment';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  loadRecentActivities() {
    const activities: ActivityItem[] = [];
    const opps = this.crmData.opportunities();
    const recs = this.crmData.reclamations();

    for (const opp of opps) {
      activities.push({
        id: `opp-${opp.id}`,
        type: 'opportunity',
        title: `${opp.project_subject} — ${this.getCompanyName(opp.company)}`,
        description: `Étape : ${opp.stage} — Montant : ${opp.estimated_amount} DT`,
        date: this.formatDate(opp.expected_close_date),
        rawDate: opp.expected_close_date || ''
      });
    }

    for (const rec of recs) {
      activities.push({
        id: `rec-${rec.id}`,
        type: 'reclamation',
        title: `Ticket SAV : ${rec.subject}`,
        description: `Priorité : ${rec.priority} — Statut : ${rec.status}`,
        date: this.formatDate(rec.created_at),
        rawDate: rec.created_at || ''
      });
    }

    activities.sort((a, b) => {
      if (!a.rawDate) return 1;
      if (!b.rawDate) return -1;
      return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
    });

    this.recentActivities.set(activities.slice(0, 6));
  }
}