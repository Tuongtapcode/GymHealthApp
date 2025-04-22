from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe
from django.urls import path
from gymhealth.models import User, Packages, PackageType, Benefit, Promotion, SubscriptionPackage
from django.db.models import Count, Sum


class MyUserAdmin(UserAdmin):
    # Các trường hiển thị trên trang danh sách
    list_display = (
        'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'is_active', 'avatar_preview')
    # Các trường có thể lọc bên phải
    list_filter = ('role', 'is_active', 'is_superuser')

    # Các trường có thể tìm kiếm
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')

    # Sắp xếp mặc định
    ordering = ('username',)

    # Các trường chỉ đọc trong form chỉnh sửa
    # readonly_fields = ('date_joined', 'last_login')
    readonly_fields = ['avatar_preview']
    # Tùy chỉnh fieldsets cho trang thêm/sửa
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Thông tin cá nhân',
         {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'date_of_birth', 'address', 'avatar')}),
        ('Vai trò', {'fields': ('role',)}),
        #   ('Quyền hạn', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Ngày quan trọng', {'fields': ('last_login', 'date_joined')}),
    )

    # Tùy chỉnh fieldsets cho trang thêm mới (optional)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'phone_number', 'avatar_preview'),
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


class MyAdminSite(admin.AdminSite):
    site_header = 'GymHealth Online'

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path('gymhealth-stats/', self.admin_view(self.gymhealth_stats)),  # thêm self.admin_view()
        ]
        return my_urls + urls

    def gymhealth_stats(self, request):
        package_stats = Packages.objects.annotate(
            total_subscriptions=Count('subscriptions'),
            # liên kết theo related_name="subscriptions" trong SubscriptionPackage
            total_revenue=Sum('subscriptions__discounted_price')  # tổng doanh thu đã discount từ gói này
        ).order_by('-total_subscriptions')
        stats = {
            'package_stats': package_stats,
        }
        return TemplateResponse(request, 'admin/stats.html', {
            'stats': stats
        })

admin_site = MyAdminSite(name='GymHealth')
# Đăng ký User model với Admin site
admin_site.register(User, MyUserAdmin)
admin_site.register(Packages)
admin_site.register(PackageType)
admin_site.register(Benefit)
admin_site.register(Promotion)
