from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import Alerta, Kitnet, Pagamento


class AuthRequiredTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_endpoints_protegidos_exigem_autenticacao(self):
        endpoints = [
            '/api/kitnets/',
            '/api/inquilinos/',
            '/api/pagamentos/',
            '/api/alertas/',
            '/api/dashboard/',
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(
                response.status_code, status.HTTP_401_UNAUTHORIZED, msg=endpoint
            )


class LoginLogoutTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='maria', password='senha-forte-123')

    def test_login_com_credenciais_corretas_retorna_token(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'maria', 'password': 'senha-forte-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'maria')
        self.assertTrue(Token.objects.filter(user=self.user, key=response.data['token']).exists())

    def test_login_com_senha_errada_retorna_401(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'maria', 'password': 'senha-errada'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_com_usuario_inexistente_retorna_401(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'nao-existe', 'password': 'qualquer'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_invalida_o_token(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        logout_response = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response_after = self.client.get('/api/kitnets/')
        self.assertEqual(response_after.status_code, status.HTTP_401_UNAUTHORIZED)


class KitnetViewSetTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='maria', password='senha-forte-123')
        self.client.force_authenticate(user=self.user)

    def test_lista_kitnets_autenticado(self):
        Kitnet.objects.create(nome='Kitnet 1', valor_aluguel=Decimal('800'), data_vencimento=10)

        response = self.client.get('/api/kitnets/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_cria_kitnet(self):
        payload = {
            'nome': 'Kitnet Nova',
            'valor_aluguel': '950.00',
            'data_vencimento': 5,
        }

        response = self.client.post('/api/kitnets/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Kitnet.objects.count(), 1)
        self.assertEqual(Kitnet.objects.get().status, 'alugada')

    def test_atualiza_status_da_kitnet(self):
        kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800'), data_vencimento=10, status='alugada'
        )

        response = self.client.patch(f'/api/kitnets/{kitnet.id}/', {'status': 'vaga'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kitnet.refresh_from_db()
        self.assertEqual(kitnet.status, 'vaga')

    def test_remove_kitnet(self):
        kitnet = Kitnet.objects.create(
            nome='Kitnet 1', valor_aluguel=Decimal('800'), data_vencimento=10
        )

        response = self.client.delete(f'/api/kitnets/{kitnet.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Kitnet.objects.count(), 0)


class DashboardViewTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username='maria', password='senha-forte-123')
        self.client.force_authenticate(user=self.user)

    def test_agrega_dados_corretamente(self):
        alugada = Kitnet.objects.create(
            nome='Alugada', valor_aluguel=Decimal('800'), data_vencimento=10, status='alugada'
        )
        Kitnet.objects.create(
            nome='Vaga', valor_aluguel=Decimal('700'), data_vencimento=10, status='vaga'
        )
        Kitnet.objects.create(
            nome='Manutencao', valor_aluguel=Decimal('600'), data_vencimento=10, status='manutencao'
        )
        Pagamento.objects.create(
            kitnet=alugada,
            data_esperada=timezone.now().date() - timedelta(days=2),
            valor=Decimal('800'),
            status='pendente',
        )
        Alerta.objects.create(
            kitnet=alugada, tipo='outro', titulo='Aviso', mensagem='Aviso teste', visualizado=False
        )

        response = self.client.get('/api/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['total_kitnets'], 3)
        self.assertEqual(data['alugadas'], 1)
        self.assertEqual(data['vagas'], 1)
        self.assertEqual(data['manutencao'], 1)
        self.assertEqual(Decimal(data['total_mensal']), Decimal('800.00'))
        self.assertEqual(data['pagamentos_pendentes'], 1)
        self.assertEqual(data['pagamentos_atrasados'], 1)
        self.assertEqual(data['alertas_nao_vistos'], 1)

    def test_total_mensal_zero_quando_nao_ha_kitnet_alugada(self):
        Kitnet.objects.create(
            nome='Vaga', valor_aluguel=Decimal('700'), data_vencimento=10, status='vaga'
        )

        response = self.client.get('/api/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['total_mensal']), Decimal('0'))
