from django.core.management.base import BaseCommand
from datetime import date
from crm.models import Company, Contact, Interaction, Opportunity


class Command(BaseCommand):
    help = "Importe les données réelles du fichier Excel de suivi du pipe commercial LCA"

    def handle(self, *args, **options):
        # ---- 1. Prospects sans offre encore (Lead) ----
        prospects = [
            {'name': 'Bulgin', 'date': date(2024, 4, 1)},
            {'name': 'Asmara', 'date': date(2024, 4, 18)},
            {'name': 'Tecnusi', 'sector': 'Automobile', 'date': date(2025, 1, 8)},
            {'name': 'Saida', 'sector': 'Agri food', 'date': date(2025, 1, 11)},
            {'name': 'APTIV', 'sector': 'Aéronautique', 'date': date(2025, 1, 8)},
            {'name': 'Actia', 'date': date(2025, 8, 12)},
            {'name': 'CIPI Actia', 'date': date(2026, 8, 17)},
            {'name': 'ASSAD', 'date': date(2026, 8, 18)},
            {'name': 'AVO Carbon', 'date': date(2025, 1, 7)},
            {
                'name': 'Delmon France', 'sector': 'Aéronautique',
                'activity_domain': 'Usinage', 'date': date(2025, 9, 9),
                'contact': ('François', 'Bouviala', 'Directeur Groupe'),
                'interaction_note': 'Visite sur site',
            },
            {'name': 'Catering Delight', 'date': date(2025, 9, 12)},
            {'name': 'Madar Group'},
            {'name': 'FSP'},
        ]

        for p in prospects:
            company, created = Company.objects.get_or_create(
                name=p['name'],
                defaults={
                    'sector': p.get('sector', ''),
                    'activity_domain': p.get('activity_domain', ''),
                    'status': 'Lead',
                }
            )
            if 'contact' in p:
                first, last, role = p['contact']
                Contact.objects.get_or_create(
                    company=company, first_name=first, last_name=last,
                    defaults={'role': role}
                )
            if 'interaction_note' in p:
                Interaction.objects.get_or_create(
                    company=company, type='Visite',
                    date=p.get('date', date.today()),
                    defaults={'note': p['interaction_note']}
                )
            self.stdout.write(f"  Prospect : {p['name']} ({'créé' if created else 'déjà existant'})")

        # ---- 2. Vraies offres (Opportunity) ----
        offers = [
            {
                'offer_id': 'MDC-26-001', 'year': 2026, 'company': 'MCW',
                'project_subject': 'Formation / Recrutement',
                'contacts': [('Amani', 'Methni', 'Qualité et formation'), ('Manel', 'Askri', 'RH')],
                'email': 'a.methni@mcw.tn',
                'historique': "03/03/2026 : Visite sur site / 1ère demande de formation",
                'canal': 'Prospection directe',
                'stage': 'Clôturé', 'result': 'En cours',
                'amount': 15000, 'probability': 80,
                'close_date': date(2026, 6, 30),
                'lost_reason': '', 'plan': 'Relance prévue le 22/06 suite à l\'envoi de la V2.',
            },
            {
                'offer_id': 'MDC-26-002', 'year': 2026, 'company': 'Timilec',
                'project_subject': 'Formation',
                'contacts': [('Houssem', 'Limem', 'Responsable formation')],
                'canal': None,
                'stage': 'Offre Soumise', 'result': 'Gagné',
                'amount': 8500, 'probability': 100,
                'close_date': date(2026, 6, 15),
                'lost_reason': '', 'plan': 'Contrat signé. Transmis au processus Réalisation.',
            },
            {
                'offer_id': 'MDC-26-003', 'year': 2026, 'company': 'Beretta',
                'project_subject': 'Formation / Recrutement / Consulting',
                'contacts': [('Kais', 'Bouhachem', 'Directeur du site'), ('Emna', 'Khiari', 'Directrice des opérations')],
                'stage': 'Offre Soumise', 'result': 'Perdu',
                'amount': 22000, 'probability': 0,
                'close_date': date(2026, 6, 10),
                'lost_reason': 'Concurrent moins cher',
                'plan': 'Débriefing fait : Revoir notre grille sur les audits courts.',
            },
            {
                'offer_id': 'MDC-26-004', 'year': 2026, 'company': 'Athir',
                'project_subject': 'Formation / Consulting',
                'contacts': [('Chokri', 'Dahbi', 'Responsable qualité')],
                'stage': 'Offre Soumise', 'result': 'En cours',
                'amount': 12500, 'probability': 50,
                'close_date': date(2026, 7, 15),
                'lost_reason': '', 'plan': 'Maquette envoyée, attente retour DG.',
            },
            {
                'offer_id': 'MDC-26-005', 'year': 2026, 'company': 'Amphenol',
                'project_subject': 'Formation',
                'contacts': [('Omar', 'Rjaibi', 'Responsable qualité')],
                'historique': '09/04/2026 : Réunion',
                'stage': 'Qualification', 'result': 'En cours',
                'amount': 0, 'probability': 0,
                'close_date': None,
                'lost_reason': '', 'plan': '',
            },
        ]

        for o in offers:
            company, _ = Company.objects.get_or_create(
                name=o['company'], defaults={'status': 'Client'}
            )
            # Toutes les entreprises avec une offre deviennent des Clients
            if company.status == 'Lead':
                company.status = 'Client'
                company.save()

            for first, last, role in o['contacts']:
                Contact.objects.get_or_create(
                    company=company, first_name=first, last_name=last,
                    defaults={'role': role, 'email': o.get('email', '') if first == o['contacts'][0][0] else ''}
                )

            if 'historique' in o:
                Interaction.objects.get_or_create(
                    company=company, type='Réunion', date=date.today(),
                    defaults={'note': o['historique']}
                )

            opp, created = Opportunity.objects.get_or_create(
                offer_id=o['offer_id'],
                defaults={
                    'year': o['year'],
                    'company': company,
                    'project_subject': o['project_subject'],
                    'stage': o['stage'],
                    'result': o['result'],
                    'estimated_amount': o['amount'],
                    'probability': o['probability'],
                    'expected_close_date': o['close_date'],
                    'lost_reason': o['lost_reason'],
                    'action_plan': o['plan'],
                }
            )
            self.stdout.write(f"  Offre : {o['offer_id']} - {o['company']} ({'créée' if created else 'déjà existante'})")

        self.stdout.write(self.style.SUCCESS('\nImport terminé avec succès !'))