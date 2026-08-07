# pyrefly: ignore [missing-import]
from rest_framework import serializers
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import update_last_login
from .models import Company, Contact, Interaction, NonConformite, Opportunity,  Feedback, Campaign, Notification, SatisfactionSurveyPDF, PrestataireEvaluation
from django.contrib.auth.models import User

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'


class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = '__all__'


class PrestataireEvaluationSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')

    class Meta:
        model = PrestataireEvaluation
        fields = '__all__'


class CompanySerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    prestataire_evaluations = PrestataireEvaluationSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = '__all__'


class OpportunitySerializer(serializers.ModelSerializer):
    weighted_revenue = serializers.ReadOnlyField()

    class Meta:
        model = Opportunity
        fields = '__all__'





class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'last_login', 'date_joined']
        read_only_fields = ['last_login', 'date_joined']
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        update_last_login(None, self.user)
        return data
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'is_read', 'created_at']


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

class NonConformiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = NonConformite
        fields = '__all__'


class SatisfactionSurveyPDFSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()
    criteres_disponibles = serializers.SerializerMethodField()

    class Meta:
        model = SatisfactionSurveyPDF
        fields = ['id', 'company', 'company_name', 'year', 'service_type',
                  'detailed_scores', 'score_global', 'score_recommendation', 'future_intent',
                  'point_fort', 'amelioration', 'pdf_file', 'uploaded_at',
                  'uploaded_by', 'uploaded_by_name', 'notes', 'criteres_disponibles']
        read_only_fields = ['score_global']  # calculé automatiquement côté serveur si detailed_scores fourni

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            name = f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
            return name if name else obj.uploaded_by.username
        return "Administrateur"

    def get_criteres_disponibles(self, obj):
        """Renvoie la liste des critères attendus pour le service_type de cet enregistrement,
        pratique pour que le frontend sache quels champs afficher."""
        return SatisfactionSurveyPDF.CRITERES_PAR_SERVICE.get(obj.service_type, [])