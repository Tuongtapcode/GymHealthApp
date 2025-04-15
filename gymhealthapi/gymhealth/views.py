from gymhealth import serializers
from rest_framework import viewsets, generics, permissions

from gymhealth.models import User


class UserViewSet(viewsets.ModelViewSet, generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer

