from django.contrib import admin
from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')
router.register(r'health-info', views.HealthInfoViewSet, basename='health-info')
router.register(r'package-types', views.PackageTypeViewSet, basename='package-types')
router.register(r'benefits', views.BenefitViewSet, basename='benefits')
router.register(r'packages', views.PackageViewSet, basename='packages')
urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.UserRegisterView.as_view(), name='user-register'),

    path('profile/', views.UserProfileView.as_view(), name='profile'),
]
