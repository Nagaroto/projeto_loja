from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from rest_framework import serializers

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Definimos que esperamos 'email' e 'password' do React
    username_field = 'email' 

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        try:
            # Busca o usuário pelo e-mail para pegar o 'username' real do Django
            user = User.objects.get(email=email)
            username = user.username
            
            # Passa o username real para o validador padrão do JWT
            data = super().validate({
                "username": username,
                "password": password
            })
            return data
            
        except User.DoesNotExist:
            # Se não achar o e-mail, lança um erro que o React vai capturar como 401
            raise serializers.ValidationError("Usuário não encontrado com este e-mail.")
