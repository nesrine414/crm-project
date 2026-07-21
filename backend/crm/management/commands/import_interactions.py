import re
import openpyxl
from datetime import datetime
from django.core.management.base import BaseCommand
from crm.models import Company, Interaction

EXCEL_FILENAME = "ENR-MDC-02 Tableau de Suivi des Offres et du Pipe Commercial (1) (1).xlsx"
SHEET_NAME = "Tableau de Suivi des Offres et "

DATE_LINE_RE = re.compile(r'^(\d{2}/\d{2}/\d{4})\s*:\s*(.*)$')


def guess_type(note_text):
    text = note_text.lower()
    if 'visite' in text:
        return 'Visite'
    if 'appel' in text or 'téléphon' in text:
        return 'Appel'
    if 'email' in text or 'mail' in text:
        return 'Email'
    if 'entretien' in text:
        return 'Entretien'
    return 'Réunion'


def parse_interactions_cell(raw_text, fallback_date):
    """Découpe le texte libre de la colonne N en une liste de (date, note)."""
    entries = []
    current_date = None
    current_parts = []

    lines = str(raw_text).split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        match = DATE_LINE_RE.match(stripped)
        if match:
            if current_date:
                entries.append((current_date, ' '.join(current_parts).strip()))
            current_date = match.group(1)
            current_parts = [match.group(2)]
        else:
            continuation = stripped.lstrip(':').strip()
            if continuation:
                current_parts.append(continuation)

    if current_date:
        entries.append((current_date, ' '.join(current_parts).strip()))
    elif current_parts:
        # Aucune date trouvée dans le texte -> on utilise la date de saisie de la ligne Excel
        fallback_str = fallback_date.strftime('%d/%m/%Y') if fallback_date else None
        if fallback_str:
            entries.append((fallback_str, ' '.join(current_parts).strip()))

    return entries


class Command(BaseCommand):
    help = "Importe proprement les interactions depuis le fichier Excel (date séparée de la note)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help="Applique réellement les changements. Sans cette option, le script fait un aperçu (dry-run) uniquement."
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']

        wb = openpyxl.load_workbook(EXCEL_FILENAME, data_only=True)
        ws = wb[SHEET_NAME]

        total_created = 0
        total_deleted = 0
        companies_in_sheet = []

        for row in ws.iter_rows(min_row=2, values_only=False):
            company_cell = row[3]   # colonne D
            date_saisie_cell = row[2]  # colonne C
            interactions_cell = row[13]  # colonne N

            company_name = company_cell.value
            if not company_name or not str(company_name).strip():
                continue

            company_name = str(company_name).strip()
            companies_in_sheet.append(company_name)

            company = Company.objects.filter(name__iexact=company_name).first()
            if not company:
                self.stdout.write(self.style.WARNING(
                    f"  Entreprise introuvable dans le CRM : '{company_name}' — ligne ignorée."
                ))
                continue

            if not interactions_cell.value:
                continue

            fallback_date = date_saisie_cell.value if isinstance(date_saisie_cell.value, datetime) else None
            parsed_entries = parse_interactions_cell(interactions_cell.value, fallback_date)

            if not parsed_entries:
                continue

            # On supprime les anciennes interactions mal importées pour cette entreprise,
            # avant de recréer les bonnes.
            existing = Interaction.objects.filter(company=company)
            existing_count = existing.count()
            if existing_count:
                self.stdout.write(
                    f"'{company.name}' : {existing_count} interaction(s) existante(s) seront supprimées et remplacées."
                )
                if apply_changes:
                    existing.delete()
                total_deleted += existing_count

            for date_str, note in parsed_entries:
                try:
                    date_obj = datetime.strptime(date_str, '%d/%m/%Y').date()
                except ValueError:
                    self.stdout.write(self.style.WARNING(
                        f"  Date illisible '{date_str}' pour '{company.name}' — entrée ignorée."
                    ))
                    continue

                interaction_type = guess_type(note)
                self.stdout.write(
                    f"  -> {company.name} | {date_obj} | {interaction_type} | {note[:60]}"
                )

                if apply_changes:
                    Interaction.objects.create(
                        company=company,
                        type=interaction_type,
                        date=date_obj,
                        note=note
                    )
                total_created += 1

        self.stdout.write("")
        if apply_changes:
            self.stdout.write(self.style.SUCCESS(
                f"Terminé. {total_deleted} ancienne(s) interaction(s) supprimée(s), {total_created} nouvelle(s) créée(s)."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"Aperçu seulement (dry-run). {total_deleted} interaction(s) seraient supprimées, "
                f"{total_created} seraient créées. Relance avec --apply pour appliquer réellement."
            ))