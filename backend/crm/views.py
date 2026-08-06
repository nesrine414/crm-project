from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, permissions
from rest_framework import generics
from .models import Notification
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import NonConformite
from .serializers import NonConformiteSerializer

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Company, Contact, Interaction, Opportunity, Reclamation, ReclamationNote, Feedback, Campaign, SatisfactionSurveyPDF, PrestataireEvaluation
from .serializers import (
    CompanySerializer, ContactSerializer, InteractionSerializer,
    OpportunitySerializer, ReclamationSerializer, ReclamationNoteSerializer,
    FeedbackSerializer, CampaignSerializer, UserSerializer, RegisterSerializer,CustomTokenObtainPairSerializer, NotificationSerializer,
    SatisfactionSurveyPDFSerializer, PrestataireEvaluationSerializer
)
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by('-created_at')
    serializer_class = CompanySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class PrestataireEvaluationViewSet(viewsets.ModelViewSet):
    queryset = PrestataireEvaluation.objects.all().order_by('-year', 'company__name')
    serializer_class = PrestataireEvaluationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        company_id = self.request.query_params.get('company')
        year = self.request.query_params.get('year')
        if company_id:
            qs = qs.filter(company_id=company_id)
        if year:
            qs = qs.filter(year=year)
        return qs


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer


class InteractionViewSet(viewsets.ModelViewSet):
    queryset = Interaction.objects.all().order_by('-date')
    serializer_class = InteractionSerializer


class OpportunityViewSet(viewsets.ModelViewSet):
    queryset = Opportunity.objects.all().order_by('-entry_date')
    serializer_class = OpportunitySerializer


class ReclamationViewSet(viewsets.ModelViewSet):
    queryset = Reclamation.objects.all().order_by('-created_at')
    serializer_class = ReclamationSerializer


class ReclamationNoteViewSet(viewsets.ModelViewSet):
    queryset = ReclamationNote.objects.all()
    serializer_class = ReclamationNoteSerializer


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-date')
    serializer_class = FeedbackSerializer


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Création d'une nouvelle utilisatrice avec mot de passe (réutilise RegisterSerializer)
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        # On désactive plutôt que supprimer, pour garder l'historique de ses actions passées
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'], url_path='reactivate')
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['patch'], url_path='update-profile')
    def update_profile(self, request):
        # Modification de son PROPRE profil (nom, email)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response({'detail': 'Mot de passe actuel incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 8:
            return Response({'detail': 'Le nouveau mot de passe doit contenir au moins 8 caractères.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Si ce compte existe, un email a été envoyé.'})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        send_mail(
            subject="Réinitialisation de votre mot de passe — LCA CRM",
            message=f"Bonjour,\n\nCliquez sur ce lien pour réinitialiser votre mot de passe :\n{reset_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({'detail': 'Si ce compte existe, un email a été envoyé.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({'detail': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, data['token']):
            return Response({'detail': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data['new_password'])
        user.save()

        return Response({'detail': 'Mot de passe mis à jour avec succès.'})
    
class NonConformiteViewSet(viewsets.ModelViewSet):
    queryset = NonConformite.objects.all()
    serializer_class = NonConformiteSerializer


class SatisfactionSurveyPDFViewSet(viewsets.ModelViewSet):
    queryset = SatisfactionSurveyPDF.objects.all()
    serializer_class = SatisfactionSurveyPDFSerializer

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(uploaded_by=self.request.user)
        else:
            serializer.save()


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'detail': 'Token Google manquant.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            return Response({'detail': 'Token Google invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        email = payload.get('email')
        if not email or not payload.get('email_verified'):
            return Response({'detail': 'Email Google non vérifié.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': payload.get('given_name', ''),
                'last_name': payload.get('family_name', ''),
            }
        )
        if created:
            user.set_unusable_password()  # elle ne se connectera jamais avec un mot de passe classique
            user.save()

        if not user.is_active:
            return Response({'detail': 'Ce compte a été désactivé.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })