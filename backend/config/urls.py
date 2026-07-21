from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from crm.views import CustomTokenObtainPairView, current_user

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('crm.urls')),
        path('api/me/', current_user, name='current_user'),

    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]