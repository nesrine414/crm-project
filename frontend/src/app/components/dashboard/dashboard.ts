import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { DecimalPipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CrmDataService, NonConformite, SatisfactionSurveyPDF, Stage } from '../../services/crm-data';

interface ActivityItem {
  id: string;
  type: 'opportunity' | 'nc';
  title: string;
  description: string;
  date: string;
  rawDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  crmData = inject(CrmDataService);
  recentActivities = signal<ActivityItem[]>([]);
  nonConformites = signal<NonConformite[]>([]);
  satisfactionPDFs = signal<SatisfactionSurveyPDF[]>([]);

  stats = computed(() => {
    const comps = this.crmData.clients();
    const opps = this.crmData.opportunities();

    const activeOpps = opps.filter(o => o.result === 'En cours');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + Number(o.estimated_amount || 0), 0);

    const wonOpps = opps.filter(o => o.result === 'Gagné');
    const totalRevenue = wonOpps.reduce((sum, o) => sum + Number(o.estimated_amount || 0), 0);

    return {
      clientCount: comps.filter(c => c.status === 'Client' || c.status as string === 'Client').length,
      leadCount: comps.filter(c => c.status === 'Lead').length,
      partnerCount: comps.filter(c => c.status as string === 'Partenaire').length,
      totalCompanies: comps.length,
      pipelineValue: totalPipeline,
      totalRevenue: totalRevenue
    };
  });

  openNcCount = computed(() => {
    return this.nonConformites().filter(nc => nc.statut === 'Ouvert').length;
  });

  satisfactionScoreAvg = computed(() => {
    const pdfs = this.satisfactionPDFs();
    if (pdfs.length === 0) return null;
    const sum = pdfs.reduce((acc, s) => acc + (s.score_global || 5), 0);
    return Math.round((sum / pdfs.length) * 10) / 10;
  });

  npsScore = computed(() => {
    const pdfs = this.satisfactionPDFs();
    if (pdfs.length > 0) {
      const promoters = pdfs.filter(f => f.score_recommendation >= 9).length;
      const detractors = pdfs.filter(f => f.score_recommendation <= 6).length;
      return Math.round(((promoters - detractors) / pdfs.length) * 100);
    }
    const list = this.crmData.feedbacks();
    if (list.length === 0) return null;
    const promoters = list.filter(f => f.rating === 5).length;
    const detractors = list.filter(f => f.rating <= 3).length;
    return Math.round(((promoters - detractors) / list.length) * 100);
  });

  pipelineFunnel = computed(() => {
    const opps = this.crmData.opportunities();
    const stages: Stage[] = ['Qualification', 'Chiffrage', 'Offre Soumise', 'Négociation', 'Clôturé'];
    const totalOpps = opps.length || 1;

    return stages.map(stage => {
      const stageOpps = opps.filter(o => o.stage === stage);
      const sumAmount = stageOpps.reduce((sum, o) => sum + Number(o.estimated_amount || 0), 0);
      const count = stageOpps.length;
      const pct = Math.round((count / totalOpps) * 100);
      return {
        stage,
        count,
        sumAmount,
        pct
      };
    });
  });

  sectorDistribution = computed(() => {
    const clients = this.crmData.clients();
    if (clients.length === 0) return [];

    const counts = new Map<string, number>();
    for (const c of clients) {
      const sec = c.sector?.trim() || 'Non spécifié';
      counts.set(sec, (counts.get(sec) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / clients.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    const colors = ['#0284c7', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#64748b', '#14b8a6'];
    return sorted.map((s, idx) => ({ ...s, color: colors[idx % colors.length] }));
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

  wonByYear = computed(() => {
    const opps = this.crmData.opportunities().filter(o => o.result === 'Gagné');
    const buckets = new Map<string, { year: string; count: number }>();

    for (const opp of opps) {
      const dateStr = opp.expected_close_date || opp.entry_date;
      if (!dateStr) continue;
      const year = String(new Date(dateStr).getFullYear());
      const existing = buckets.get(year);
      if (existing) {
        existing.count += 1;
      } else {
        buckets.set(year, { year, count: 1 });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => a.year.localeCompare(b.year));
    const maxCount = Math.max(...sorted.map(b => b.count), 1);
    return sorted.map(b => ({
      ...b,
      pctCount: Math.round((b.count / maxCount) * 100)
    }));
  });

  ngOnInit() {
    this.refreshAllData();
  }

  refreshAllData() {
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

    this.crmData.getNonConformites().subscribe({
      next: (data) => {
        this.nonConformites.set(data);
        this.loadRecentActivities();
      },
      error: (err) => console.error(err)
    });

    this.crmData.getSatisfactionPDFs().subscribe({
      next: (data) => {
        this.satisfactionPDFs.set(data);
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
    const ncs = this.nonConformites();

    for (const opp of opps) {
      activities.push({
        id: `opp-${opp.id}`,
        type: 'opportunity',
        title: `${opp.project_subject} — ${this.getCompanyName(opp.company)}`,
        description: `Étape : ${opp.stage} — Montant : ${Number(opp.estimated_amount).toLocaleString('fr-FR')} DT`,
        date: this.formatDate(opp.expected_close_date || opp.entry_date),
        rawDate: opp.expected_close_date || opp.entry_date || ''
      });
    }

    for (const nc of ncs) {
      activities.push({
        id: `nc-${nc.id}`,
        type: 'nc',
        title: `Fiche NC N°${nc.numero} : ${nc.probleme}`,
        description: `Processus : ${nc.processus} — Statut : ${nc.statut} (${nc.avancement || 'PDCA'})`,
        date: this.formatDate(nc.date),
        rawDate: nc.date || ''
      });
    }

    activities.sort((a, b) => {
      if (!a.rawDate) return 1;
      if (!b.rawDate) return -1;
      return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
    });

    this.recentActivities.set(activities.slice(0, 8));
  }
}