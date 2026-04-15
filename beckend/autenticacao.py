# Serializer de login: valida e-mail + senha e emite tokens SimpleJWT.

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken


def _find_user_by_email_or_username(identifier):
    """Localiza usuário por e-mail (case-insensitive) ou username igual ao digitado."""
    if not identifier:
        return None
    key = identifier.strip()
    if not key:
        return None
    user = User.objects.filter(email__iexact=key).first()
    if user is not None:
        return user
    return User.objects.filter(username__iexact=key).first()


class EmailTokenObtainPairSerializer(serializers.Serializer):
    """Entrada e-mail (ou username) + senha; saída access, refresh e metadados."""

    email = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)

    def validate(self, attrs):
        raw_login = attrs.get('email', '')
        password = attrs.get('password')

        user = _find_user_by_email_or_username(raw_login)
        if user is None:
            raise serializers.ValidationError(
                "Não encontramos usuário com este e-mail. "
                "Se criou pelo admin, confira se o campo E-mail está preenchido "
                "ou use o mesmo nome de usuário cadastrado."
            )

        if not user.is_active:
            raise serializers.ValidationError("Esta conta está desativada.")

        authenticated_user = authenticate(
            username=user.username,
            password=password,
        )
        if authenticated_user is None:
            raise serializers.ValidationError("Senha incorreta.")

        refresh = RefreshToken.for_user(authenticated_user)
        return {
            'email': user.email or raw_login.strip(),
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'is_staff': authenticated_user.is_staff,
            'user_id': authenticated_user.id,
        }
