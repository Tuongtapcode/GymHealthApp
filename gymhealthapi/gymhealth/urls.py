from django.contrib import admin
from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

from .views import UserViewSet

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')
urlpatterns = [
    path('', include(router.urls)),
]