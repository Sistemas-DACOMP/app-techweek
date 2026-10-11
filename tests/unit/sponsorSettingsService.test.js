import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_QUALIFICATION_TAGS,
  DEFAULT_WHATSAPP_TEMPLATES,
  getSponsorSettings,
  saveSponsorSettings,
  resetSponsorSettings,
  resetTagsToDefault,
  resetTemplatesToDefault,
  interpolateTemplate,
  getActiveOutreachMessage,
  sanitizeFeedHandle,
  resetFeedProfileToDefault,
} from '../../src/lib/sponsorSettingsService';

describe('sponsorSettingsService', () => {
  const companyId = 'test_kanastra';

  beforeEach(() => {
    resetSponsorSettings(companyId);
  });

  describe('Valores Padrão e Leitura', () => {
    it('retorna os valores padrão quando não há nada salvo', () => {
      const settings = getSponsorSettings(companyId);
      expect(settings.tags).toEqual(DEFAULT_QUALIFICATION_TAGS);
      expect(settings.templates.length).toBe(4);
      expect(settings.activeTemplateId).toBe('recruiter_outreach');
    });

    it('mantém as 8 tags padrão alinhadas com o modal de lead', () => {
      expect(DEFAULT_QUALIFICATION_TAGS).toEqual([
        'Estágio',
        'Júnior',
        'Frontend',
        'Backend',
        'Mobile',
        'Dados / IA',
        'Design / UI',
        'Destaque',
      ]);
    });
  });

  describe('Interpolação de Variáveis em Templates', () => {
    it('substitui {nome}, {empresa} e {curso} corretamente com primeiro nome', () => {
      const tpl = 'Olá, {nome}! Bem-vindo à {empresa}! Você estuda {curso}?';
      const output = interpolateTemplate(tpl, {
        name: 'Ana Clara Silveira',
        companyName: 'Kanastra',
        course: 'Sistemas de Informação',
      });

      expect(output).toBe('Olá, Ana! Bem-vindo à Kanastra! Você estuda Sistemas de Informação?');
    });

    it('suporta {primeiro_nome} e chaves com espaços ou maiúsculas', () => {
      const tpl = 'Oi { PRIMEIRO_NOME }, aqui é da { EMPRESA } para alunos de { Curso }.';
      const output = interpolateTemplate(tpl, {
        name: 'Gabriel Santos',
        companyName: 'UberHub',
        course: 'Ciência da Computação',
      });

      expect(output).toBe('Oi Gabriel, aqui é da UberHub para alunos de Ciência da Computação.');
    });

    it('aplica fallbacks seguros quando os dados são parciais ou vazios', () => {
      const tpl = 'Olá, {nome}! Equipe {empresa} / {curso}.';
      const output = interpolateTemplate(tpl, {});

      expect(output).toBe('Olá, Participante! Equipe nossa empresa / Computação.');
    });
  });

  describe('Persistência e Gerenciamento de Tags', () => {
    it('permite adicionar e remover tags mantendo outras configurações', () => {
      const newTags = ['Estágio', 'Júnior', 'Cybersec', 'Cloud AWS'];
      const saved = saveSponsorSettings(companyId, { tags: newTags });

      expect(saved.tags).toEqual(newTags);
      const reloaded = getSponsorSettings(companyId);
      expect(reloaded.tags).toEqual(newTags);
      expect(reloaded.templates.length).toBe(4);
    });

    it('permite restaurar apenas as tags para o padrão', () => {
      saveSponsorSettings(companyId, { tags: ['Custom Tag'] });
      expect(getSponsorSettings(companyId).tags).toEqual(['Custom Tag']);

      resetTagsToDefault(companyId);
      expect(getSponsorSettings(companyId).tags).toEqual(DEFAULT_QUALIFICATION_TAGS);
    });
  });

  describe('Edição de Modelos WhatsApp', () => {
    it('permite editar o texto do template ativo', () => {
      const current = getSponsorSettings(companyId);
      const updatedTemplates = current.templates.map((t) => {
        if (t.id === 'recruiter_outreach') {
          return { ...t, text: 'Fala {nome}! Aqui é da {empresa}. Bora bater um papo?' };
        }
        return t;
      });

      saveSponsorSettings(companyId, { templates: updatedTemplates });

      const msg = getActiveOutreachMessage(companyId, {
        name: 'Lucas Ferreira',
        companyName: 'Kanastra',
      });

      expect(msg).toBe('Fala Lucas! Aqui é da Kanastra. Bora bater um papo?');
    });

    it('permite alternar o modelo ativo de 1-clique', () => {
      saveSponsorSettings(companyId, { activeTemplateId: 'interview_invite' });
      const settings = getSponsorSettings(companyId);
      expect(settings.activeTemplateId).toBe('interview_invite');

      const msg = getActiveOutreachMessage(companyId, {
        name: 'Beatriz',
        companyName: 'LayerX',
      });
      expect(msg).toContain('marcar um bate-papo técnico');
    });

    it('permite restaurar modelos de mensagem para o padrão original', () => {
      saveSponsorSettings(companyId, {
        templates: [{ id: 'custom', title: 'Custom', description: '', text: 'Custom msg' }],
      });
      const reset = resetTemplatesToDefault(companyId);
      expect(reset.templates).toEqual(DEFAULT_WHATSAPP_TEMPLATES);
    });
  });

  describe('Perfil Público de Feed (Avatar e @handle)', () => {
    it('retorna @companyId como handle padrão e avatar vazio', () => {
      const settings = getSponsorSettings(companyId);
      expect(settings.feedProfile).toBeDefined();
      expect(settings.feedProfile.handle).toBe(`@${companyId}`);
      expect(settings.feedProfile.avatarUrl).toBe('');
      expect(settings.feedProfile.displayName).toBe('');
    });

    it('sanitiza o handle removendo caracteres especiais, forçando lowercase e limitando tamanho', () => {
      expect(sanitizeFeedHandle('Kanastra Tech!')).toBe('@kanastratech');
      expect(sanitizeFeedHandle('@bayer.agro_2026')).toBe('@bayer.agro_2026');
      expect(sanitizeFeedHandle('  @aimirim_ai  ')).toBe('@aimirim_ai');
      expect(sanitizeFeedHandle('handle_muito_longo_que_passa_de_vinte_e_quatro_caracteres')).toHaveLength(25); // @ + 24
      expect(sanitizeFeedHandle('')).toBe('');
      expect(sanitizeFeedHandle(null)).toBe('');
    });

    it('persiste foto de perfil, @handle customizado e nome de exibição', () => {
      const saved = saveSponsorSettings(companyId, {
        feedProfile: {
          handle: '@kanastra_oficial',
          avatarUrl: 'https://cdn.techweek.com/kanastra-avatar.png',
          displayName: 'Kanastra Tech Hub',
        },
      });

      expect(saved.feedProfile.handle).toBe('@kanastra_oficial');
      expect(saved.feedProfile.avatarUrl).toBe('https://cdn.techweek.com/kanastra-avatar.png');
      expect(saved.feedProfile.displayName).toBe('Kanastra Tech Hub');

      const reloaded = getSponsorSettings(companyId);
      expect(reloaded.feedProfile.handle).toBe('@kanastra_oficial');
      expect(reloaded.feedProfile.avatarUrl).toBe('https://cdn.techweek.com/kanastra-avatar.png');
      expect(reloaded.feedProfile.displayName).toBe('Kanastra Tech Hub');
    });

    it('restaura o perfil de feed para o padrão original', () => {
      saveSponsorSettings(companyId, {
        feedProfile: {
          handle: '@custom_handle',
          avatarUrl: 'https://exemplo.com/avatar.jpg',
          displayName: 'Nome Customizado',
        },
      });

      const reset = resetFeedProfileToDefault(companyId);
      expect(reset.feedProfile.handle).toBe(`@${companyId}`);
      expect(reset.feedProfile.avatarUrl).toBe('');
      expect(reset.feedProfile.displayName).toBe('');
    });
  });
});
