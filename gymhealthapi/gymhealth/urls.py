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
router.register(r'subscription', views.SubscriptionPackageViewSet, basename='subscription')
router.register(r'workout-sessions', views.WorkoutSessionViewSet, basename='workout-sessions')
router.register(r'training-progress', views.TrainingProgressViewSet, basename='training-progress')
urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.UserRegisterView.as_view(), name='user-register'),

    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('trainers/', views.TrainerListView.as_view(), name='trainer-list'),
    path('trainers/<int:trainer_id>/', views.TrainerDetailView.as_view(), name='trainer-detail'),
    path('trainers/<int:trainer_id>/upcoming_sessions/', views.TrainerUpcomingSessionsView.as_view(),
         name='trainer-upcoming-sessions'),
    # path('workout-sessions/member/register/', views.WorkoutSessionCreateView.as_view(), name='workout-session-create'),
    # path('workout-sessions/trainer/sessions/', views.TrainerWorkoutSessionListView.as_view(), name='trainer-sessions'),
    # path('workout-sessions/trainer/sessions/<int:pk>/', views.TrainerWorkoutSessionUpdateView.as_view(),
    #      name='trainer-session-update'),
    # path('workout-sessions/trainer/sessions/<int:session_id>/reschedule/', views.RescheduleSessionView.as_view(),
    #      name='trainer-reschedule-session'),
]
