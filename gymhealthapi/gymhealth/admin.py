from datetime import timezone, timedelta

from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django.contrib.auth.admin import UserAdmin
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe
from django.urls import path
from gymhealth.models import (
    User, Packages, PackageType, Benefit, Promotion, SubscriptionPackage,
    WorkoutSession, HealthInfo, MemberProfile, TrainerProfile, TrainingProgress,
    Exercise, Notification, Payment, PaymentReceipt, TrainerRating, GymRating,
    FeedbackResponse, Gym, MemberProxy, TrainerProxy, ManagerProxy
)
from django.db.models import Count, Sum, Avg
from django.db.models.functions import ExtractHour


class MembershipStatusFilter(SimpleListFilter):
    title = 'Trạng thái hội viên'
    parameter_name = 'status'

    def lookups(self, request, model_admin):
        return (
            ('active', 'Còn hiệu lực'),
            ('expired', 'Hết hạn'),
            ('expiring_soon', 'Sắp hết hạn'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'active':
            return queryset.filter(is_active=True, membership_end_date__gte=timezone.now().date())
        if self.value() == 'expired':
            return queryset.filter(membership_end_date__lt=timezone.now().date())
        if self.value() == 'expiring_soon':
            thirty_days_later = timezone.now().date() + timedelta(days=30)
            return queryset.filter(
                is_active=True,
                membership_end_date__gte=timezone.now().date(),
                membership_end_date__lte=thirty_days_later
            )
        return queryset


# Hiển thị mỗi bản ghi dưới dạng khối (stacked) — mỗi trường nằm trên một dòng
class HealthInfoInline(admin.StackedInline):
    model = HealthInfo
    can_delete = False
    verbose_name_plural = 'Thông tin sức khỏe'
    fk_name = 'user'
    extra = 0


class MemberProfileInline(admin.StackedInline):
    model = MemberProfile
    can_delete = False
    verbose_name_plural = 'Hồ sơ hội viên'
    fk_name = 'user'
    extra = 0


class TrainerProfileInline(admin.StackedInline):
    model = TrainerProfile
    can_delete = False
    verbose_name_plural = 'Hồ sơ huấn luyện viên'
    fk_name = 'user'
    extra = 0


# TabularInline được dùng để hiển thị và chỉnh sửa các model liên quan (related models) theo dạng bảng trong trang admin của model chính
class TrainingProgressInline(admin.TabularInline):
    model = TrainingProgress
    extra = 0
    fields = ('workout_session', 'weight', 'body_fat_percentage', 'notes')
    readonly_fields = ('created_at',)


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    fields = ('amount', 'payment_method', 'status', 'transaction_id', 'payment_date')
    readonly_fields = ('payment_date',)


class MyUserAdmin(UserAdmin):
    list_display = (
        'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'is_active', 'avatar_preview')
    list_filter = ('role', 'is_active', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    ordering = ('username',)
    readonly_fields = ['avatar_preview']

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Thông tin cá nhân',
         {'fields': (
         'first_name', 'last_name', 'email', 'phone_number', 'date_of_birth', 'address', 'gender', 'avatar')}),
        ('Vai trò', {'fields': ('role',)}),
        ('Quyền hạn', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Ngày quan trọng', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'phone_number'),
        }),
    )

    def avatar_preview(self, user):
        if user.avatar:
            return mark_safe(
                f"<img src='{user.avatar.url}' width='60' height='60' style='object-fit: cover; border-radius: 8px;' />")
        return "(Không có ảnh)"

    avatar_preview.short_description = 'Avatar'

    class Media:
        css = {
            'all': ('css/style.css',)
        }


class MemberAdmin(MyUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'phone_number', 'membership_status', 'avatar_preview')
    list_filter = ('is_active', 'member_profile__membership_end_date')
    inlines = [HealthInfoInline, MemberProfileInline]

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='MEMBER')

    def membership_status(self, obj):
        try:
            profile = obj.member_profile
            if profile.is_membership_valid:
                return f"Còn hạn (còn {profile.days_until_expiry} ngày)"
            return "Hết hạn"
        except MemberProfile.DoesNotExist:
            return "Chưa kích hoạt"

    membership_status.short_description = "Trạng thái hội viên"


class TrainerAdmin(MyUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'phone_number', 'specialized_in', 'rating', 'avatar_preview')
    list_filter = ('is_active', 'trainer_profile__specialization')
    inlines = [TrainerProfileInline]

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='TRAINER')

    def specialized_in(self, obj):
        try:
            return obj.trainer_profile.specialization or "Chưa cập nhật"
        except TrainerProfile.DoesNotExist:
            return "Chưa cập nhật"

    def rating(self, obj):
        ratings = TrainerRating.objects.filter(trainer=obj)
        if ratings.exists():
            avg = ratings.aggregate(avg=Avg('score'))['avg']
            return f"{avg:.1f}/5 ({ratings.count()} đánh giá)"
        return "Chưa có đánh giá"

    specialized_in.short_description = "Chuyên môn"
    rating.short_description = "Đánh giá"


class ManagerAdmin(MyUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'phone_number', 'is_active', 'avatar_preview')

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role='MANAGER')


class PackagesAdmin(admin.ModelAdmin):
    list_display = ('name', 'package_type', 'price', 'price_per_month', 'pt_sessions', 'subscriptions_count', 'active')
    list_filter = ('package_type', 'active')
    search_fields = ('name', 'description')
    filter_horizontal = ('benefits',)

    def subscriptions_count(self, obj):
        return obj.subscriptions.count()

    subscriptions_count.short_description = "Số lượng đăng ký"


class SubscriptionPackageAdmin(admin.ModelAdmin):
    list_display = (
        'member', 'package', 'start_date', 'end_date', 'status', 'remaining_pt_sessions', 'discounted_price')
    list_filter = (MembershipStatusFilter, 'status', 'package')
    search_fields = ('member__username', 'member__first_name', 'member__last_name')
    readonly_fields = ('created_at',)
    date_hierarchy = 'start_date'
    inlines = [PaymentInline]


class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('member', 'trainer', 'session_date', 'start_time', 'end_time', 'session_type', 'status')
    list_filter = ('session_type', 'status', 'session_date')
    search_fields = ('member__username', 'trainer__username', 'notes')
    date_hierarchy = 'session_date'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Nếu người dùng là huấn luyện viên, chỉ hiển thị các buổi tập liên quan đến họ
        if not request.user.is_superuser and request.user.is_trainer:
            return qs.filter(trainer=request.user)
        return qs


class HealthInfoAdmin(admin.ModelAdmin):
    list_display = ('user', 'height', 'weight', 'bmi', 'training_goal', 'updated_at')
    list_filter = ('training_goal',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'updated_at', 'bmi')


class TrainingProgressAdmin(admin.ModelAdmin):
    list_display = ('get_member_name', 'get_session_date', 'weight', 'body_fat_percentage', 'created_by', 'created_at')
    list_filter = ('workout_session__session_date', 'created_by')
    search_fields = ('workout_session__member__username', 'notes', 'health_info__user__username')
    date_hierarchy = 'workout_session__session_date'

    def get_member_name(self, obj):
        return obj.health_info.user.username

    get_member_name.short_description = 'Thành viên'
    get_member_name.admin_order_field = 'health_info__user__username'

    def get_session_date(self, obj):
        return obj.workout_session.session_date

    get_session_date.short_description = 'Ngày'
    get_session_date.admin_order_field = 'workout_session__session_date'


class PaymentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'amount', 'payment_method', 'status', 'payment_date', 'has_receipt')
    list_filter = ('status', 'payment_method', 'payment_date')
    search_fields = ('subscription__member__username', 'transaction_id', 'notes')
    date_hierarchy = 'payment_date'

    def has_receipt(self, obj):
        try:
            return obj.receipt is not None
        except:
            return False

    has_receipt.boolean = True
    has_receipt.short_description = "Có biên lai"


class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ('payment', 'upload_date', 'verified', 'verified_by', 'verification_date')
    list_filter = ('verified', 'upload_date', 'verification_date')
    search_fields = ('payment__subscription__member__username', 'notes')
    readonly_fields = ('upload_date',)

    def save_model(self, request, obj, form, change):
        if 'verified' in form.changed_data and obj.verified:
            obj.verified_by = request.user
            obj.verification_date = timezone.now()
        super().save_model(request, obj, form, change)


class PromotionAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'promo_code', 'discount_percentage', 'discount_amount', 'valid_from', 'valid_to', 'is_active',
        'is_valid',
        'times_used')
    list_filter = ('is_active', 'valid_from', 'valid_to')
    search_fields = ('title', 'description', 'promo_code')
    filter_horizontal = ('applicable_packages',)
    readonly_fields = ('times_used',)


class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at', 'sent')
    list_filter = ('notification_type', 'is_read', 'sent', 'created_at')
    search_fields = ('user__username', 'title', 'message')
    date_hierarchy = 'created_at'


class BaseRatingAdmin(admin.ModelAdmin):
    list_display = ('user', 'score', 'anonymous', 'created_at')
    list_filter = ('score', 'anonymous', 'created_at')
    search_fields = ('user__username', 'comment')
    date_hierarchy = 'created_at'


class TrainerRatingAdmin(BaseRatingAdmin):
    list_display = ('trainer', 'user', 'score', 'average_score', 'anonymous', 'created_at')
    list_filter = ('score', 'anonymous', 'created_at')
    search_fields = ('trainer__username', 'user__username', 'comment')


class GymRatingAdmin(BaseRatingAdmin):
    list_display = ('gym', 'user', 'score', 'average_score', 'anonymous', 'created_at')
    list_filter = ('score', 'anonymous', 'created_at')
    search_fields = ('gym__name', 'user__username', 'comment')


class MyAdminSite(admin.AdminSite):
    site_header = 'GymHealth Online'
    site_title = 'GymHealth Admin'
    index_title = 'Quản lý GymHealth'

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path('gymhealth-stats/', self.admin_view(self.gymhealth_stats), name="gymhealth-stats"),
        ]
        return my_urls + urls

    def gymhealth_stats(self, request):
        package_stats = Packages.objects.annotate(
            total_subscriptions=Count('subscriptions'),
            total_revenue=Sum('subscriptions__discounted_price')
        ).order_by('-total_subscriptions')

        # Thống kê số lượng người dùng theo vai trò
        user_stats = {
            'total_members': User.objects.filter(role='MEMBER').count(),
            'total_trainers': User.objects.filter(role='TRAINER').count(),
            'total_managers': User.objects.filter(role='MANAGER').count(),
            'active_members': User.objects.filter(role='MEMBER', is_active=True).count(),
        }

        # Thống kê số buổi tập theo loại và trạng thái
        workout_stats = {
            'pending_sessions': WorkoutSession.objects.filter(status='pending').count(),
            'confirmed_sessions': WorkoutSession.objects.filter(status='confirmed').count(),
            'completed_sessions': WorkoutSession.objects.filter(status='completed').count(),
            'cancelled_sessions': WorkoutSession.objects.filter(status='cancelled').count(),
            'pt_sessions': WorkoutSession.objects.filter(session_type='pt_session').count(),
            'self_training': WorkoutSession.objects.filter(session_type='self_training').count(),
        }
        # Thống kê doanh thu theo tháng
        from django.db.models.functions import TruncMonth
        revenue_by_month = Payment.objects.filter(
            status='completed'
        ).annotate(
            month=TruncMonth('payment_date')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        # Tạo các khung giờ phổ biến trong phòng gym
        time_slots = {
            'early_morning': (5, 8),  # 5:00 - 8:59
            'morning': (9, 11),  # 9:00 - 11:59
            'noon': (12, 13),  # 12:00 - 13:59
            'afternoon': (14, 16),  # 14:00 - 16:59
            'evening': (17, 20),  # 17:00 - 20:59
            'night': (21, 23)  # 21:00 - 23:59
        }
        # Truy vấn số lượng buổi tập theo giờ
        hourly_usage = WorkoutSession.objects.filter(
            status__in=['confirmed', 'completed']
        ).annotate(
            hour=ExtractHour('start_time')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('hour')
        # Chuyển đổi dữ liệu theo giờ thành dữ liệu theo khung giờ
        time_slot_usage = {slot: 0 for slot in time_slots.keys()}
        hourly_data = {item['hour']: item['count'] for item in hourly_usage}

        for slot_name, (start_hour, end_hour) in time_slots.items():
            for hour in range(start_hour, end_hour + 1):
                time_slot_usage[slot_name] += hourly_data.get(hour, 0)

            # Phân tích xu hướng sử dụng theo ngày trong tuần
        from django.db.models.functions import ExtractWeekDay
        weekday_usage = WorkoutSession.objects.filter(
            status__in=['confirmed', 'completed']
        ).annotate(
            weekday=ExtractWeekDay('session_date')
        ).values('weekday').annotate(
            count=Count('id')
        ).order_by('weekday')

        # Chuyển đổi số ngày trong tuần (1=Sunday, 7=Saturday) sang tên ngày
        weekday_names = {
            1: 'Chủ nhật',
            2: 'Thứ hai',
            3: 'Thứ ba',
            4: 'Thứ tư',
            5: 'Thứ năm',
            6: 'Thứ sáu',
            7: 'Thứ bảy'
        }

        weekday_data = {weekday_names[item['weekday']]: item['count'] for item in weekday_usage}

        # Tính tổng doanh thu
        total_revenue = Payment.objects.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0


        stats = {
            'package_stats': package_stats,
            'user_stats': user_stats,
            'workout_stats': workout_stats,
            'revenue_by_month': revenue_by_month,
            'hourly_usage': hourly_usage,
            'time_slot_usage': time_slot_usage,
            'weekday_usage': weekday_data,
            'total_revenue': total_revenue,
        }

        return TemplateResponse(request, 'admin/stats.html', {
            'title': 'Thống kê GymHealth',
            'stats': stats
        })



admin_site = MyAdminSite(name='GymHealth')
# Đăng ký User model với Admin site
admin_site.register(User, MyUserAdmin)

admin_site.register(MemberProxy, MemberAdmin)
admin_site.register(TrainerProxy, TrainerAdmin)
admin_site.register(ManagerProxy, ManagerAdmin)

admin_site.register(Packages, PackagesAdmin)
admin_site.register(PackageType)
admin_site.register(Benefit)
admin_site.register(Promotion, PromotionAdmin)
admin_site.register(SubscriptionPackage, SubscriptionPackageAdmin)
admin_site.register(WorkoutSession, WorkoutSessionAdmin)
admin_site.register(HealthInfo, HealthInfoAdmin)
admin_site.register(TrainingProgress, TrainingProgressAdmin)
admin_site.register(Exercise)
admin_site.register(Notification, NotificationAdmin)
admin_site.register(Payment, PaymentAdmin)
admin_site.register(PaymentReceipt, PaymentReceiptAdmin)
admin_site.register(TrainerRating, TrainerRatingAdmin)
admin_site.register(GymRating, GymRatingAdmin)
admin_site.register(FeedbackResponse)
admin_site.register(Gym)
