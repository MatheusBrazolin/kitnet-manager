from rest_framework import viewsets, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Kitnet, Inquilino, Pagamento, Alerta, ConfiguracaoSistema
from .serializers import (
    KitnetSerializer, InquilinoSerializer, PagamentoSerializer,
    AlertaSerializer, DashboardSerializer
)


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
        'total_mensal': sum(k.valor_aluguel for k in kitnets.filter(status='alugada')),
        'pagamentos_pendentes': Pagamento.objects.filter(status='pendente').count(),
        'pagamentos_atrasados': Pagamento.objects.filter(
            status='pendente', data_esperada__lt=hoje
        ).count(),
        'alertas_nao_vistos': Alerta.objects.filter(visualizado=False).count(),
    }

    serializer = DashboardSerializer(data)
    return Response(serializer.data)
