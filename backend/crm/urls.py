from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    CompanyViewSet, ContactViewSet, InteractionViewSet, NotificationViewSet,
    OpportunityViewSet, ReclamationViewSet, ReclamationNoteViewSet,
    FeedbackViewSet, CampaignViewSet, UserViewSet, RegisterView, PasswordResetRequestView,
    PasswordResetConfirmView, NonConformiteViewSet, SatisfactionSurveyPDFViewSet
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'interactions', InteractionViewSet)
router.register(r'opportunities', OpportunityViewSet)
router.register(r'reclamations', ReclamationViewSet)
router.register(r'reclamation-notes', ReclamationNoteViewSet)
router.register(r'feedbacks', FeedbackViewSet)
router.register(r'campaigns', CampaignViewSet)
router.register(r'users', UserViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'non-conformites', NonConformiteViewSet)
router.register(r'satisfaction-pdfs', SatisfactionSurveyPDFViewSet)

urlpatterns = router.urls + [
    path('register/', RegisterView.as_view(), name='register'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]