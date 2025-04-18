from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.safestring import mark_safe

from gymhealth.models import User, Packages, PackageType, Benefit


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
        ('Quyền hạn', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Ngày quan trọng', {'fields': ('last_login', 'date_joined')}),
    )

    # Tùy chỉnh fieldsets cho trang thêm mới (optional)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'phone_number', 'avatar'),
        }),
    )

    def avatar_preview(self, obj):
        if obj.avatar:
            return mark_safe(
                f"<img src='{obj.avatar.url}' width='60' height='60' style='object-fit: cover; border-radius: 8px;' />")
        return "(Không có ảnh)"

    avatar_preview.short_description = 'Avatar'

    class Media:
        css = {
            'all': ('css/style.css',)
        }


# Đăng ký User model với Admin site
admin.site.register(User, MyUserAdmin)
admin.site.register(Packages)
admin.site.register(PackageType)
admin.site.register(Benefit)
