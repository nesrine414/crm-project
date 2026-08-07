from django.contrib import admin
from .models import (
    Company, Prestataire, Contact, Interaction, Opportunity,  Feedback, Campaign, NonConformite, SatisfactionSurveyPDF,
    PrestataireEvaluation
)

@admin.register(Prestataire)
class PrestataireAdmin(admin.ModelAdmin):
    list_display = ('name', 'service_provided', 'patente', 'interlocuteur_principal', 'email', 'phone', 'convention_contrat')
    list_filter = ('service_provided', 'patente', 'convention_contrat')
    search_fields = ('name', 'interlocuteur_principal', 'email', 'phone')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(status='Prestataire')

@admin.register(PrestataireEvaluation)
class PrestataireEvaluationAdmin(admin.ModelAdmin):
    list_display = ('company', 'year', 'prix', 'qualite', 'prestation_service', 'respect_delais', 'score_percent', 'decision')
    list_filter = ('year', 'decision')
    search_fields = ('company__name', 'notes')

admin.site.register(Company)
admin.site.register(Contact)
admin.site.register(Interaction)
admin.site.register(Opportunity)

admin.site.register(Feedback)
admin.site.register(Campaign)
admin.site.register(NonConformite)
admin.site.register(SatisfactionSurveyPDF)

