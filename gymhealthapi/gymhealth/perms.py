from rest_framework import permissions


class IsOwner(permissions.IsAuthenticated):
    """
    Chỉ cho phép người dùng là chủ sở hữu của object truy cập.
    """
    def has_object_permission(self, request, view, obj):
        return super().has_permission(request, view) and request.user == obj.user


class IsCommentOwner(permissions.IsAuthenticated):
    """
    Chỉ cho phép người dùng là chủ sở hữu của comment truy cập.
    """
    def has_object_permission(self, request, view, comment):
        return super().has_permission(request, view) and request.user == comment.user


class IsManager(permissions.BasePermission):
    """
    Chỉ cho phép Manager truy cập.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_manager


class IsManagerOrReadOnly(permissions.BasePermission):
    """
    Cho phép đọc cho tất cả người dùng nhưng chỉ Manager mới có thể sửa.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_manager


class IsTrainer(permissions.BasePermission):
    """
    Chỉ cho phép Trainer truy cập.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_trainer


class IsTrainerOrManager(permissions.BasePermission):
    """
    Cho phép Trainer hoặc Manager truy cập.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_trainer or request.user.is_manager)


class IsSessionParticipant(permissions.BasePermission):
    """
    Cho phép truy cập nếu là huấn luyện viên hoặc hội viên tham gia buổi tập.
    """
    def has_object_permission(self, request, view, obj):
        return (request.user.is_authenticated and
                (request.user == obj.trainer.user or request.user == obj.member or request.user.is_manager))


class IsSubscriptionOwnerOrManager(permissions.BasePermission):
    """
    Cho phép truy cập nếu là chủ gói đăng ký hoặc quản lý.
    """
    def has_object_permission(self, request, view, obj):
        return (request.user.is_authenticated and
                (request.user == obj.member or request.user.is_manager))


class IsProfileOwnerOrManager(permissions.BasePermission):
    """
    Cho phép truy cập hồ sơ nếu là chủ sở hữu hoặc quản lý.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True  # Cho phép xem hồ sơ
        return (request.user.is_authenticated and
                (request.user == obj.user or request.user.is_manager))