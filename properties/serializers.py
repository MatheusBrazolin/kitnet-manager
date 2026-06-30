from rest_framework import serializers
from .models import Kitnet, Inquilino, Pagamento, Alerta, ConfiguracaoSistema


class InquilinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquilino
        fields = '__all__'


class PagamentoSerializer(serializers.ModelSerializer):
    kitnet_nome = serializers.CharField(source='kitnet.nome', read_only=True)
    dias_atraso = serializers.IntegerField(read_only=True)

    class Meta:
        model = Pagamento
        fields = '__all__'


class AlertaSerializer(serializers.ModelSerializer):
    kitnet_nome = serializers.CharField(source='kitnet.nome', read_only=True)

    class Meta:
        model = Alerta
        fields = '__all__'


class KitnetSerializer(serializers.ModelSerializer):
    inquilino = InquilinoSerializer(read_only=True)
    pagamento_atrasado = serializers.BooleanField(read_only=True)
    dias_para_vencer = serializers.IntegerField(read_only=True)

    class Meta:
        model = Kitnet
        fields = '__all__'


class DashboardSerializer(serializers.Serializer):
    total_kitnets = serializers.IntegerField()
    alugadas = serializers.IntegerField()
    vagas = serializers.IntegerField()
    manutencao = serializers.IntegerField()
    total_mensal = serializers.DecimalField(max_digits=12, decimal_places=2)
    pagamentos_pendentes = serializers.IntegerField()
    pagamentos_atrasados = serializers.IntegerField()
    alertas_nao_vistos = serializers.IntegerField()
