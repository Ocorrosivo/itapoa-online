import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPortalEmail, escapeHtml, mailService } from '../../src/server/services/mailService.js';

test('email template: renderPortalEmail generates complete visual layout with portal branding', () => {
  const html = renderPortalEmail({
    title: 'Seu pedido foi entregue',
    recipientName: 'Jonas Silva',
    leadParagraph: 'O seu pedido <strong>PED-MVLY1R9S-2C45</strong> já está disponível na sua conta.',
    orderBadge: 'Plano Gold VIP — Ativação Imediata para Mercado Central (R$ 49,90)',
    howToUseSubtitle: 'PASSO A PASSO PARA ATIVAR E APROVEITAR SEU ACESSO',
    steps: [
      'Acesse seu painel comercial pelo botão abaixo.',
      'Confira os recursos exclusivos já liberados para sua empresa.',
      'Atualize o catálogo e fotos da sua vitrine comercial.',
      'Cadastre seu WhatsApp direto para atendimento de clientes.',
      'Sua empresa já está em destaque para toda a cidade!'
    ],
    securityNote: 'Não compartilhe suas credenciais. Se precisar de ajuda, nosso suporte está à disposição.',
    ctaText: 'Ver meu pedido no painel',
    ctaUrl: 'https://itapoa.online/painel',
    feedbackTitle: 'Deixe a sua avaliação da nossa plataforma',
    feedbackText: 'Sua opinião vale ouro para quem está decidindo conhecer as melhores empresas e serviços em Itapoá.',
    feedbackButtonText: 'Avaliar no portal',
    feedbackUrl: 'https://itapoa.online',
  });

  // Marca oficial e topo escuro
  assert.ok(html.includes('ITAPOÁ ONLINE'), 'Deve conter o nome em caixa alta da marca');
  assert.ok(html.includes('https://itapoa.online/logotipo.png'), 'Deve conter o logotipo oficial do portal');
  assert.ok(html.includes('background-color: #080F24'), 'Deve conter o topo escuro institucional');

  // Saudação personalizada e título
  assert.ok(html.includes('Olá, <strong>Jonas Silva</strong>.'), 'Deve conter saudação com o nome');
  assert.ok(html.includes('Seu pedido foi entregue'), 'Deve conter o título');
  assert.ok(html.includes('PED-MVLY1R9S-2C45'), 'Deve conter o código do pedido');

  // Passo a passo "Como usar"
  assert.ok(html.includes('Como usar'), 'Deve conter o cabeçalho Como usar');
  assert.ok(html.includes('PASSO A PASSO PARA ATIVAR E APROVEITAR SEU ACESSO'), 'Deve conter o subtítulo');
  assert.ok(html.includes('Acesse seu painel comercial pelo botão abaixo.'), 'Deve conter os passos');

  // Botão CTA Dourado/Amarelo
  assert.ok(html.includes('Ver meu pedido no painel'), 'Deve conter texto do botão');
  assert.ok(html.includes('https://itapoa.online/painel'), 'Deve apontar para a URL correta');
  assert.ok(html.includes('#F59E0B'), 'Deve ter estilo dourado/amarelo chamativo');

  // Caixa de avaliação com borda amarela
  assert.ok(html.includes('border: 2px solid #FCD34D'), 'Deve ter a caixa com borda amarela');
  assert.ok(html.includes('Deixe a sua avaliação da nossa plataforma'), 'Deve ter título de avaliação');

  // Bloco escuro de acesso exclusivo com WhatsApp e Instagram
  assert.ok(html.includes('ACESSO EXCLUSIVO'), 'Deve ter a tag ACESSO EXCLUSIVO');
  assert.ok(html.includes('Entrar no canal do WhatsApp'), 'Deve ter o botão do canal do WhatsApp');
  assert.ok(html.includes('Seguir no Instagram'), 'Deve ter o botão do Instagram');
  assert.ok(html.includes('https://wa.me/5547997190413'), 'Deve apontar para o WhatsApp oficial');
  assert.ok(html.includes('https://instagram.com/itapoaonline'), 'Deve apontar para o Instagram oficial');

  // Rodapé e suporte
  assert.ok(html.includes('contato@itapoa.online'), 'Deve conter e-mail de suporte');
});

test('email template: escapeHtml protects against script/html injection', () => {
  const dangerous = '<script>alert("xss")</script> & "test" \'quote\'';
  const safe = escapeHtml(dangerous);
  assert.equal(safe.includes('<script>'), false);
  assert.ok(safe.includes('&lt;script&gt;'));
  assert.ok(safe.includes('&quot;test&quot;'));
});
