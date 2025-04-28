from rest_framework import permissions, exceptions


# class IsOwner(permissions.IsAuthenticated):
#     """
#     Chỉ cho phép người dùng là chủ sở hữu của object truy cập.
#     """
#     def has_object_permission(self, request, view, obj):
#         return super().has_permission(request, view) and request.user == obj.user

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsManager(permissions.BasePermission):
    """
    Chỉ cho phép Manager truy cập.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            raise exceptions.NotAuthenticated(detail="Authentication credentials were not provided.")
        if not request.user.is_manager:
            raise exceptions.PermissionDenied(detail="Bạn không phải là quản lý.")
        return True


class IsMember(permissions.BasePermission):
    """
    Chỉ cho phép member truy cập.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            raise exceptions.NotAuthenticated(detail="Authentication credentials were not provided.")
        if not request.user.is_member:
            raise exceptions.PermissionDenied(detail="Bạn không phải là hội viên.")
        return True


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
        if not request.user.is_authenticated:
            raise exceptions.NotAuthenticated(detail="Authentication credentials were not provided.")
        if request.user == obj.member or request.user.is_manager:
            return True
        raise exceptions.PermissionDenied(detail="Bạn không có quyền truy cập gói đăng ký này.")


class IsProfileOwnerOrManager(permissions.BasePermission):
    """
    Cho phép truy cập hồ sơ nếu là chủ sở hữu hoặc quản lý.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True  # Cho phép xem hồ sơ
        return (request.user.is_authenticated and
                (request.user == obj.user or request.user.is_manager))


class IsTrainerOrReadOnly(permissions.BasePermission):
    """
    Chỉ cho phép PT tạo và cập nhật, người khác chỉ đọc
    """

    def has_permission(self, request, view):
        # Cho phép GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True

        # Chỉ cho phép PT tạo và cập nhật
        return request.user.is_trainer


class IsTrainerOrMemberOwner(permissions.BasePermission):
    """
    Cho phép:
    - PT có thể xem và cập nhật tiến độ của mọi hội viên
    - Hội viên chỉ có thể xem tiến độ của chính mình
    """

    def has_object_permission(self, request, view, obj):
        # PT có thể truy cập mọi tiến độ
        if request.user.is_trainer:
            return True

        # Hội viên chỉ được xem tiến độ của chính mình
        if request.method in permissions.SAFE_METHODS:
            return obj.health_info.user == request.user

        # Không cho phép hội viên cập nhật
        return False


class IsCreatorOrReadOnly(permissions.BasePermission):
    """
    Cho phép chỉ người tạo mới có thể chỉnh sửa bản ghi
    """

    def has_object_permission(self, request, view, obj):
        # Đọc thì ai cũng được
        if request.method in permissions.SAFE_METHODS:
            return True

        # Chỉ người tạo mới được sửa
        return obj.created_by == request.user
