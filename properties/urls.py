from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'kitnets', views.KitnetViewSet)
router.register(r'inquilinos', views.InquilinoViewSet)
router.register(r'pagamentos', views.PagamentoViewSet)
router.register(r'alertas', views.AlertaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
]
