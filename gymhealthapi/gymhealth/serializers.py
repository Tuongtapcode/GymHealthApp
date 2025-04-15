from rest_framework.serializers import ModelSerializer
from gymhealth.models import User, Packages

class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')