from decimal import Decimal

from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authtoken.models import Token
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from django.db.models import Sum
from django.utils import timezone
from .models import Kitnet, Inquilino, Pagamento, Alerta, ConfiguracaoSistema
from .serializers import (
    KitnetSerializer, InquilinoSerializer, PagamentoSerializer,
    AlertaSerializer, DashboardSerializer
)


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class KitnetViewSet(viewsets.ModelViewSet):
    queryset = Kitnet.objects.all()
    serializer_class = KitnetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['nome', 'endereco']


class InquilinoViewSet(viewsets.ModelViewSet):
    queryset = Inquilino.objects.select_related('kitnet').all()
    serializer_class = InquilinoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['ativo', 'kitnet']
    search_fields = ['nome', 'email', 'telefone']


class PagamentoViewSet(viewsets.ModelViewSet):
    queryset = Pagamento.objects.select_related('kitnet').all()
    serializer_class = PagamentoSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'kitnet', 'metodo_pagamento']
    ordering_fields = ['data_esperada', 'valor']


class AlertaViewSet(viewsets.ModelViewSet):
    queryset = Alerta.objects.select_related('kitnet').all()
    serializer_class = AlertaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['visualizado', 'kitnet', 'tipo']


@api_view(['GET'])
def dashboard(request):
    kitnets = Kitnet.objects.all()
    hoje = timezone.now().date()

    data = {
        'total_kitnets': kitnets.count(),
        'alugadas': kitnets.filter(status='alugada').count(),
        'vagas': kitnets.filter(status='vaga').count(),
        'manutencao': kitnets.filter(status='manutencao').count(),
        'total_mensal': kitnets.filter(status='alugada').aggregate(
            total=Sum('valor_aluguel')
        )['total'] or Decimal('0'),
        'pagamentos_pendentes': Pagamento.objects.filter(status='pendente').count(),
        'pagamentos_atrasados': Pagamento.objects.filter(
            status='pendente', data_esperada__lt=hoje
        ).count(),
        'alertas_nao_vistos': Alerta.objects.filter(visualizado=False).count(),
    }

    serializer = DashboardSerializer(data)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    user = authenticate(request, username=username, password=password)

    if user is None or not user.is_active:
        return Response({'detail': 'Usuário ou senha inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username})


@api_view(['POST'])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
