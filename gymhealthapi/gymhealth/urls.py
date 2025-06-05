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
router.register(r'trainer-rating', views.TrainerRatingViewSet, basename='trainer-rating')
router.register(r'gym-rating', views.GymRatingViewSet, basename='gym-rating')
router.register(r'feedback-response', views.FeedbackResponseViewSet, basename='feedback-response')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'payment-receipts', views.PaymentReceiptViewSet, basename='payment-receipt')
router.register(r'notifications', views.NotificationViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.UserRegisterView.as_view(), name='user-register'),

    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('trainers/', views.TrainerListView.as_view(), name='trainer-list'),
    path('trainers/<int:trainer_id>/', views.TrainerDetailView.as_view(), name='trainer-detail'),
    path('trainers/<int:trainer_id>/upcoming_sessions/', views.TrainerUpcomingSessionsView.as_view(),
         name='trainer-upcoming-sessions'),
        path('api/payments/momo/ipn/', views.MoMoIPNView.as_view(), name='momo-ipn'),
        path('api/payments/momo/return/', views.MoMoReturnView.as_view(), name='momo-return'),
    # VNPay URLs
        path('api/payments/vnpay/create/', views.CreateVNPayPaymentView.as_view(), name='vnpay-create'),
        path('api/payments/vnpay/return/', views.VNPayReturnView.as_view(), name='vnpay-return'),
        path('api/payments/vnpay/ipn/', views.VNPayIPNView.as_view(), name='vnpay-ipn'),

]
