from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from datetime import timedelta


class Kitnet(models.Model):
    STATUS_CHOICES = [
        ('alugada', 'Alugada'),
        ('vaga', 'Vaga'),
        ('manutencao', 'Em Manutenção'),
    ]

    nome = models.CharField(max_length=100, help_text="Ex: Kitnet 1, Kitnet Rua X")
    endereco = models.CharField(max_length=255, blank=True)
    valor_aluguel = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    data_vencimento = models.IntegerField(
        help_text="Dia do mês (1-28) em que vence o pagamento",
        validators=[MinValueValidator(1)]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='alugada')
    observacoes = models.TextField(blank=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kitnet"
        verbose_name_plural = "Kitnets"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} - R$ {self.valor_aluguel}"

    @property
    def pagamento_atrasado(self):
        return Pagamento.objects.filter(
            kitnet=self,
            status='pendente',
            data_esperada__lt=timezone.now().date()
        ).exists()

    @property
    def dias_para_vencer(self):
        hoje = timezone.now().date()
        proximo_vencimento = hoje.replace(day=self.data_vencimento)

        if hoje.day > self.data_vencimento:
            if hoje.month == 12:
                proximo_vencimento = proximo_vencimento.replace(year=hoje.year + 1, month=1)
            else:
                proximo_vencimento = proximo_vencimento.replace(month=hoje.month + 1)

        dias = (proximo_vencimento - hoje).days
        return dias if dias > 0 else 0


class Inquilino(models.Model):
    kitnet = models.OneToOneField(Kitnet, on_delete=models.SET_NULL, null=True, blank=True)
    nome = models.CharField(max_length=150)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    data_entrada = models.DateField()
    data_saida_prevista = models.DateField(null=True, blank=True)
    ativo = models.BooleanField(default=True)
    observacoes = models.TextField(blank=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Inquilino"
        verbose_name_plural = "Inquilinos"
        ordering = ['-data_entrada']

    def __str__(self):
        return f"{self.nome} - {self.kitnet.nome if self.kitnet else 'Sem kitnet'}"


class Pagamento(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('atrasado', 'Atrasado'),
        ('cancelado', 'Cancelado'),
    ]

    METODO_CHOICES = [
        ('pix', 'PIX'),
        ('boleto', 'Boleto'),
        ('deposito', 'Depósito'),
        ('dinheiro', 'Dinheiro'),
        ('outro', 'Outro'),
    ]

    kitnet = models.ForeignKey(Kitnet, on_delete=models.CASCADE, related_name='pagamentos')
    data_esperada = models.DateField()
    data_recebimento = models.DateField(null=True, blank=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    valor_recebido = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    metodo_pagamento = models.CharField(max_length=20, choices=METODO_CHOICES, default='pix')
    observacoes = models.TextField(blank=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"
        ordering = ['-data_esperada']
        indexes = [
            models.Index(fields=['kitnet', 'status']),
            models.Index(fields=['data_esperada']),
        ]

    def __str__(self):
        return f"{self.kitnet.nome} - {self.data_esperada} - {self.get_status_display()}"

    @property
    def dias_atraso(self):
        if self.status == 'pendente':
            dias = (timezone.now().date() - self.data_esperada).days
            return dias if dias > 0 else 0
        return 0

    @property
    def diferenca_valor(self):
        if self.valor_recebido:
            return self.valor_recebido - self.valor
        return 0


class Alerta(models.Model):
    TIPO_CHOICES = [
        ('pagamento_vencido', 'Pagamento Vencido'),
        ('pagamento_vencimento', 'Pagamento Próximo Vencimento'),
        ('kitnet_vaga', 'Kitnet Ficou Vaga'),
        ('inquilino_saida', 'Inquilino Saindo'),
        ('outro', 'Outro'),
    ]

    kitnet = models.ForeignKey(Kitnet, on_delete=models.CASCADE, related_name='alertas')
    tipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=200)
    mensagem = models.TextField()
    data_alerta = models.DateTimeField(auto_now_add=True)
    visualizado = models.BooleanField(default=False)
    data_visualizacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        ordering = ['-data_alerta']

    def __str__(self):
        return f"{self.kitnet.nome} - {self.get_tipo_display()}"


class ConfiguracaoSistema(models.Model):
    nome_proprietario = models.CharField(max_length=150, default="Meu Gestor de Kitnets")
    email_notificacao = models.EmailField(blank=True)
    dias_alerta_antecedencia = models.IntegerField(
        default=3,
        help_text="Dias antes do vencimento para enviar alerta"
    )
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    def __str__(self):
        return "Configurações Gerais"
