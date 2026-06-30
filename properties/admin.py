from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from django.utils import timezone
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from .models import Kitnet, Inquilino, Pagamento, Alerta, ConfiguracaoSistema
from datetime import timedelta


class PagamentoInline(admin.TabularInline):
    model = Pagamento
    extra = 1
    fields = ('data_esperada', 'valor', 'status', 'metodo_pagamento', 'data_recebimento')
    readonly_fields = ('data_criacao',)


class InquilinoInline(admin.TabularInline):
    model = Inquilino
    extra = 0
    fields = ('nome', 'telefone', 'email', 'data_entrada', 'ativo')


@admin.register(Kitnet)
class KitnetAdmin(admin.ModelAdmin):
    list_display = ('nome_com_status', 'valor_aluguel', 'vencimento_display', 'status_pagamento', 'dias_para_vencer_display')
    list_filter = ('status', 'data_criacao')
    search_fields = ('nome', 'endereco')
    readonly_fields = ('data_criacao', 'data_atualizacao', 'resumo_financeiro')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'endereco', 'status')
        }),
        ('Financeiro', {
            'fields': ('valor_aluguel', 'data_vencimento', 'resumo_financeiro')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        }),
    )
    inlines = [InquilinoInline, PagamentoInline]

    def nome_com_status(self, obj):
        cores = {
            'alugada': '#28a745',
            'vaga': '#dc3545',
            'manutencao': '#ffc107'
        }
        cor = cores.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            cor, obj.nome
        )
    nome_com_status.short_description = 'Kitnet'

    def vencimento_display(self, obj):
        return f"Dia {obj.data_vencimento}"
    vencimento_display.short_description = 'Vencimento'

    def status_pagamento(self, obj):
        if obj.pagamento_atrasado:
            return format_html('<span style="color: red; font-weight: bold;">⚠️ ATRASADO</span>')
        return format_html('<span style="color: green;">✓ Adimplente</span>')
    status_pagamento.short_description = 'Status Pagamento'

    def dias_para_vencer_display(self, obj):
        dias = obj.dias_para_vencer
        if dias <= 3:
            return format_html('<span style="color: red; font-weight: bold;">{}d</span>', dias)
        elif dias <= 7:
            return format_html('<span style="color: orange;">{}d</span>', dias)
        return format_html('<span style="color: green;">{}d</span>', dias)
    dias_para_vencer_display.short_description = 'Dias p/ Vencer'

    def resumo_financeiro(self, obj):
        pagamentos = obj.pagamentos.all()
        total = pagamentos.aggregate(Sum('valor'))['valor__sum'] or 0
        pagos = pagamentos.filter(status='pago').aggregate(Sum('valor_recebido'))['valor_recebido__sum'] or 0
        pendente = total - pagos

        return format_html(
            '<div style="padding: 10px; background: #f8f9fa; border-radius: 5px;">'
            '<p><strong>Total esperado:</strong> R$ {:.2f}</p>'
            '<p><strong>Recebido:</strong> R$ {:.2f}</p>'
            '<p><strong style="color: red;">Pendente:</strong> R$ {:.2f}</p>'
            '</div>',
            float(total), float(pagos), float(pendente)
        )
    resumo_financeiro.short_description = 'Resumo Financeiro'


@admin.register(Inquilino)
class InquilinoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'kitnet', 'telefone_display', 'data_entrada', 'status_ativo')
    list_filter = ('ativo', 'data_entrada', 'kitnet')
    search_fields = ('nome', 'email', 'telefone')
    readonly_fields = ('data_criacao',)
    fieldsets = (
        ('Informações Pessoais', {
            'fields': ('nome', 'telefone', 'email')
        }),
        ('Locação', {
            'fields': ('kitnet', 'data_entrada', 'data_saida_prevista', 'ativo')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Metadados', {
            'fields': ('data_criacao',),
            'classes': ('collapse',)
        }),
    )

    def telefone_display(self, obj):
        if obj.telefone:
            return format_html('<a href="tel:{}">{}</a>', obj.telefone, obj.telefone)
        return "-"
    telefone_display.short_description = 'Telefone'

    def status_ativo(self, obj):
        if obj.ativo:
            return format_html('<span style="color: green;">✓ Ativo</span>')
        return format_html('<span style="color: red;">✗ Inativo</span>')
    status_ativo.short_description = 'Status'


class PagamentoResource(resources.ModelResource):
    class Meta:
        model = Pagamento
        fields = ('id', 'kitnet__nome', 'data_esperada', 'data_recebimento', 'valor', 'status', 'metodo_pagamento')


@admin.register(Pagamento)
class PagamentoAdmin(ImportExportModelAdmin):
    resource_class = PagamentoResource
    list_display = ('kitnet', 'data_esperada_display', 'valor_display', 'status_badge', 'dias_atraso_display', 'metodo_pagamento')
    list_filter = ('status', 'metodo_pagamento', 'data_esperada')
    search_fields = ('kitnet__nome',)
    readonly_fields = ('data_criacao', 'dias_atraso', 'diferenca_valor')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('kitnet', 'data_esperada', 'status')
        }),
        ('Valores', {
            'fields': ('valor', 'valor_recebido', 'diferenca_valor')
        }),
        ('Recebimento', {
            'fields': ('data_recebimento', 'metodo_pagamento')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'dias_atraso'),
            'classes': ('collapse',)
        }),
    )
    actions = ['marcar_como_pago', 'marcar_como_pendente']

    def data_esperada_display(self, obj):
        hoje = timezone.now().date()
        if obj.data_esperada < hoje:
            return format_html('<span style="color: red;">{}</span>', obj.data_esperada)
        elif obj.data_esperada - hoje <= timedelta(days=3):
            return format_html('<span style="color: orange;">{}</span>', obj.data_esperada)
        return obj.data_esperada
    data_esperada_display.short_description = 'Data Esperada'

    def valor_display(self, obj):
        return f"R$ {obj.valor:.2f}"
    valor_display.short_description = 'Valor'

    def status_badge(self, obj):
        cores = {
            'pago': '#28a745',
            'pendente': '#ffc107',
            'atrasado': '#dc3545',
            'cancelado': '#6c757d'
        }
        cor = cores.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            cor, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def dias_atraso_display(self, obj):
        dias = obj.dias_atraso
        if dias > 0:
            return format_html('<span style="color: red; font-weight: bold;">{}d atrasado</span>', dias)
        return "-"
    dias_atraso_display.short_description = 'Atraso'

    def marcar_como_pago(self, request, queryset):
        queryset.update(status='pago', data_recebimento=timezone.now().date())
        self.message_user(request, "Pagamentos marcados como pago!")
    marcar_como_pago.short_description = "Marcar como pago"

    def marcar_como_pendente(self, request, queryset):
        queryset.update(status='pendente', data_recebimento=None)
        self.message_user(request, "Pagamentos marcados como pendente!")
    marcar_como_pendente.short_description = "Marcar como pendente"


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = ('kitnet', 'tipo_display', 'titulo', 'data_alerta_display', 'visualizado_display')
    list_filter = ('tipo', 'visualizado', 'data_alerta')
    search_fields = ('kitnet__nome', 'titulo', 'mensagem')
    readonly_fields = ('data_alerta', 'data_visualizacao')
    actions = ['marcar_como_visualizado']

    def tipo_display(self, obj):
        return obj.get_tipo_display()
    tipo_display.short_description = 'Tipo'

    def data_alerta_display(self, obj):
        return obj.data_alerta.strftime('%d/%m/%Y %H:%M')
    data_alerta_display.short_description = 'Data do Alerta'

    def visualizado_display(self, obj):
        if obj.visualizado:
            return format_html('<span style="color: green;">✓ Visto</span>')
        return format_html('<span style="color: red;">✗ Novo</span>')
    visualizado_display.short_description = 'Status'

    def marcar_como_visualizado(self, request, queryset):
        queryset.update(visualizado=True, data_visualizacao=timezone.now())
        self.message_user(request, "Alertas marcados como visualizados!")
    marcar_como_visualizado.short_description = "Marcar como visualizado"


@admin.register(ConfiguracaoSistema)
class ConfiguracaoSistemaAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Informações Gerais', {
            'fields': ('nome_proprietario', 'email_notificacao')
        }),
        ('Configurações', {
            'fields': ('dias_alerta_antecedencia', 'ativo')
        }),
    )

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return not ConfiguracaoSistema.objects.exists()


admin.site.site_header = "Gestor de Kitnets"
admin.site.site_title = "Painel Administrativo"
admin.site.index_title = "Bem-vindo ao Gestor de Kitnets"
