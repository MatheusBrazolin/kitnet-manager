from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from properties.models import Kitnet, Pagamento


def _fake_now(fixed_date):
    return timezone.make_aware(
        timezone.datetime(fixed_date.year, fixed_date.month, fixed_date.day, 12, 0)
    )


class KitnetDiasParaVencerTests(TestCase):
    def setUp(self):
        self.kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800.00'), data_vencimento=20
        )

    @patch('django.utils.timezone.now')
    def test_retorna_dias_restantes_quando_vencimento_ainda_nao_chegou_no_mes(self, mock_now):
        mock_now.return_value = _fake_now(date(2026, 3, 10))

        self.assertEqual(self.kitnet.dias_para_vencer, 10)

    @patch('django.utils.timezone.now')
    def test_pula_para_o_proximo_mes_quando_vencimento_ja_passou(self, mock_now):
        mock_now.return_value = _fake_now(date(2026, 3, 25))

        self.assertEqual(self.kitnet.dias_para_vencer, 26)

    @patch('django.utils.timezone.now')
    def test_retorna_zero_no_dia_exato_do_vencimento(self, mock_now):
        mock_now.return_value = _fake_now(date(2026, 3, 20))

        self.assertEqual(self.kitnet.dias_para_vencer, 0)

    @patch('django.utils.timezone.now')
    def test_pula_para_janeiro_do_ano_seguinte_quando_vencimento_passa_em_dezembro(self, mock_now):
        mock_now.return_value = _fake_now(date(2026, 12, 25))

        self.assertEqual(self.kitnet.dias_para_vencer, 26)


class KitnetPagamentoAtrasadoTests(TestCase):
    def setUp(self):
        self.kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800.00'), data_vencimento=10
        )

    def test_true_quando_existe_pagamento_pendente_com_data_esperada_no_passado(self):
        Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() - timedelta(days=3),
            valor=Decimal('800.00'),
            status='pendente',
        )

        self.assertTrue(self.kitnet.pagamento_atrasado)

    def test_false_quando_pagamento_pendente_ainda_nao_venceu(self):
        Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() + timedelta(days=3),
            valor=Decimal('800.00'),
            status='pendente',
        )

        self.assertFalse(self.kitnet.pagamento_atrasado)

    def test_false_quando_pagamento_atrasado_ja_foi_pago(self):
        Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() - timedelta(days=3),
            valor=Decimal('800.00'),
            status='pago',
        )

        self.assertFalse(self.kitnet.pagamento_atrasado)

    def test_false_quando_nao_ha_pagamentos(self):
        self.assertFalse(self.kitnet.pagamento_atrasado)


class PagamentoDiasAtrasoTests(TestCase):
    def setUp(self):
        self.kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800.00'), data_vencimento=10
        )

    def test_conta_dias_de_atraso_quando_pendente_e_vencido(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() - timedelta(days=5),
            valor=Decimal('800.00'),
            status='pendente',
        )

        self.assertEqual(pagamento.dias_atraso, 5)

    def test_zero_quando_pendente_mas_ainda_nao_venceu(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() + timedelta(days=5),
            valor=Decimal('800.00'),
            status='pendente',
        )

        self.assertEqual(pagamento.dias_atraso, 0)

    def test_zero_quando_ja_foi_pago_mesmo_com_data_esperada_no_passado(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date() - timedelta(days=5),
            valor=Decimal('800.00'),
            status='pago',
        )

        self.assertEqual(pagamento.dias_atraso, 0)


class PagamentoDiferencaValorTests(TestCase):
    def setUp(self):
        self.kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800.00'), data_vencimento=10
        )

    def test_diferenca_negativa_quando_recebeu_menos_que_o_esperado(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date(),
            valor=Decimal('800.00'),
            valor_recebido=Decimal('750.00'),
            status='pago',
        )

        self.assertEqual(pagamento.diferenca_valor, Decimal('-50.00'))

    def test_diferenca_positiva_quando_recebeu_mais_que_o_esperado(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date(),
            valor=Decimal('800.00'),
            valor_recebido=Decimal('820.00'),
            status='pago',
        )

        self.assertEqual(pagamento.diferenca_valor, Decimal('20.00'))

    def test_zero_quando_ainda_nao_recebeu_nada(self):
        pagamento = Pagamento.objects.create(
            kitnet=self.kitnet,
            data_esperada=timezone.now().date(),
            valor=Decimal('800.00'),
            status='pendente',
        )

        self.assertEqual(pagamento.diferenca_valor, 0)
