from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from gymhealth import serializers
from rest_framework import viewsets, generics, permissions, status, request

from gymhealth.models import User, Packages, HealthInfo, MemberProfile, TrainerProfile


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class PackageViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Packages.objects.all()
    serializer_class = serializers.PackagesSerializer


class UserViewSet(viewsets.ViewSet, generics.ListAPIView):
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

    @action(methods=['get'], detail=False, url_path='', url_name='my-healthinfo')
    def get_health_info(self, request):
        """
        API GET: Lấy thông tin sức khỏe của chính user
        """
        health_info = self.get_object()
        if not health_info:
            return Response({"error": "Bạn chưa có thông tin sức khỏe"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(health_info)
        return Response(serializer.data)

    @action(methods=['put'], detail=False, url_path='', url_name='put_health_info')
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

    @action(methods=['patch'], detail=False, url_path='', url_name='update-my-healthinfo-patch')
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
