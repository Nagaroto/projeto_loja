from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from .autenticacao import EmailTokenObtainPairSerializer # Importe o seu serializer acima

# View de Login usando o seu Serializer de E-mail
class EmailTokenObtainView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

# View de Registro Simples
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        username = request.data.get('username') or email # Usa o email como username se não vier um

        if User.objects.filter(email=email).exists():
            return Response({"detail": "E-mail já cadastrado."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        return Response({"detail": "Usuário criado com sucesso!"}, status=status.HTTP_201_CREATED)
