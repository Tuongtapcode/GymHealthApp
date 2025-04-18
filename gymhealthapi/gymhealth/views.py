from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from gymhealth import serializers
from rest_framework import viewsets, generics, permissions, status, request

from gymhealth.models import User, HealthInfo, Packages, Benefit, PackageType
from gymhealth.serializers import TrainerProfileSerializer, MemberProfileSerializer, BenefitSerializer, \
    PackageTypeSerializer, PackageSerializer, PackageDetailSerializer


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class UserViewSet(viewsets.ViewSet):
    queryset = User.objects.filter(is_active=True).all()
    serializer_class = serializers.UserSerializer

    @action(methods=['get', 'patch'], url_path="current-user", detail=False,
            permission_classes=[permissions.IsAuthenticated])
    def get_current_user(self, request):
        if request.method.__eq__("PATCH"):
            u = request.user

            for key in request.data:
                if key in ['first_name', 'last_name']:
                    setattr(u, key, request.data[key])
                elif key.__eq__('password'):
                    u.set_password(request.data[key])

            u.save()
            return Response(serializers.UserSerializer(u).data)
        else:
            return Response(serializers.UserSerializer(request.user).data)


class UserRegisterView(generics.CreateAPIView):
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        message = "Đăng ký thành công."
        if user.role == 'MEMBER':
            message += " Thông tin sức khỏe của bạn đã được lưu lại."

        return Response({
            "user": serializer.data,
            "message": message,
            # "token": token.key  # Nếu bạn dùng token auth
        }, status=status.HTTP_201_CREATED)


class HealthInfoViewSet(viewsets.ViewSet):
    serializer_class = serializers.HealthInfoSerializer
    permissions_classes = [permissions.IsAuthenticated, IsOwner]

    def get_object(self):
        """
        Helper để lấy thông tin sức khỏe của user hiện tại.
        """
        try:
            return HealthInfo.objects.get(user=self.request.user)
        except HealthInfo.DoesNotExist:
            return None

    @action(methods=['get'], detail=False, url_path='my', url_name='my-healthinfo')
    def get_health_info(self, request):
        """
        API GET: Lấy thông tin sức khỏe của chính user
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info)
        return Response(serializer.data)

    @action(methods=['put'], detail=False, url_path='update-all', url_name='put_health_info')
    def put_health_info(self, request):
        """
        API PUT: Cập nhật toàn bộ thông tin sức khỏe
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializers.HealthInfoSerializer(health_info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(methods=['patch'], detail=False, url_path='update', url_name='update-my-healthinfo-patch')
    def patch_health_info(self, request):
        """
        API PATCH: Cập nhật một phần thông tin sức khỏe
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class UserProfileView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        user = self.request.user
        if user.is_trainer:
            return TrainerProfileSerializer
        elif user.is_member:
            return MemberProfileSerializer
        else:
            raise PermissionDenied("Chỉ huấn luyện viên và hội viên mới có hồ sơ.")

    def get_object(self):
        user = self.request.user
        if user.is_trainer:
            if hasattr(user, 'trainer_profile'):
                return user.trainer_profile
            else:
                raise NotFound("Hồ sơ huấn luyện viên chưa được tạo.")
        elif user.is_member:
            if hasattr(user, 'member_profile'):
                return user.member_profile
            else:
                raise NotFound("Hồ sơ hội viên chưa được tạo.")
        else:
            raise PermissionDenied("Bạn không có quyền truy cập hồ sơ.")

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PackageTypeViewSet(viewsets.ModelViewSet):
    queryset = PackageType.objects.filter(active=True)
    serializer_class = PackageTypeSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'duration_months']

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS => Ai cũng được phép (AllowAny)
            permission_classes = [permissions.AllowAny]
        else:
            # POST, PUT, PATCH, DELETE => Phải là user có quyền (IsAuthenticated)
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]


class BenefitViewSet(viewsets.ModelViewSet):
    queryset = Benefit.objects.filter(active=True)
    serializer_class = BenefitSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'description']
    ordering_fields = ['name']


class PackageViewSet(viewsets.ModelViewSet):
    queryset = Packages.objects.filter(active=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = PackageSerializer
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'package_type__duration_months', 'pt_sessions']
    filterset_fields = ['package_type', 'pt_sessions', 'price']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PackageDetailSerializer
        return PackageSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Danh sách các gói còn active"""
        packages = self.queryset.filter(active=True)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_pt(self, request):
        """Danh sách gói có buổi PT"""
        packages = self.queryset.filter(pt_sessions__gt=0)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Danh sách gói theo type_id"""
        type_id = request.query_params.get('type_id')
        if not type_id:
            return Response({"error": "Missing type_id"}, status=400)

        packages = self.queryset.filter(package_type_id=type_id)
        serializer = self.get_serializer(packages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def benefits(self, request, pk=None):
        """Danh sách quyền lợi của 1 gói"""
        package = self.get_object()
        benefits = package.benefits.filter(active=True)
        serializer = BenefitSerializer(benefits, many=True)
        return Response(serializer.data)
