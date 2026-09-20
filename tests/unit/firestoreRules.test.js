import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('firestore.rules - Segurança Perimetral (KAN-48)', () => {
  const rulesPath = resolve(process.cwd(), 'firestore.rules');
  const rulesContent = existsSync(rulesPath) ? readFileSync(rulesPath, 'utf-8') : '';

  it('deve existir o arquivo firestore.rules na raiz do projeto', () => {
    expect(existsSync(rulesPath)).toBe(true);
    expect(rulesContent).toContain("rules_version = '2'");
    expect(rulesContent).toContain('service cloud.firestore');
  });

  describe('Funções de Validação de Permissão e Identidade', () => {
    it('deve definir função isAuthenticated', () => {
      expect(rulesContent).toMatch(/function\s+isAuthenticated\s*\(\)\s*\{/);
      expect(rulesContent).toContain('request.auth != null');
    });

    it('deve definir função isOwner verificando uid', () => {
      expect(rulesContent).toMatch(/function\s+isOwner\s*\(userId\)\s*\{/);
      expect(rulesContent).toContain('request.auth.uid == userId');
    });

    it('deve definir função isAdmin checando custom claims ADMIN', () => {
      expect(rulesContent).toMatch(/function\s+isAdmin\s*\(\)\s*\{/);
      expect(rulesContent).toContain("request.auth.token.role == 'ADMIN'");
    });

    it('deve definir função isStaff checando claims STAFF ou ADMIN', () => {
      expect(rulesContent).toMatch(/function\s+isStaff\s*\(\)\s*\{/);
      expect(rulesContent).toContain("request.auth.token.role == 'STAFF'");
    });

    it('deve definir função isSponsor para proteção de leads de estande', () => {
      expect(rulesContent).toMatch(/function\s+isSponsor\s*\(sponsorId\)\s*\{/);
      expect(rulesContent).toContain("request.auth.token.role == 'SPONSOR'");
    });
  });

  describe('Proteção das Coleções Críticas', () => {
    it('protege a coleção /users/{userId} contra escalação de privilégios em role', () => {
      expect(rulesContent).toContain('match /users/{userId}');
      expect(rulesContent).toContain("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role'])");
    });

    it('protege a subcoleção point_events do usuário', () => {
      expect(rulesContent).toContain('match /point_events/{eventId}');
      expect(rulesContent).toContain('allow read: if isOwner(userId) || isStaff()');
    });

    it('restringe escrita na coleção /activities/{activityId} apenas para ADMIN', () => {
      expect(rulesContent).toContain('match /activities/{activityId}');
      expect(rulesContent).toContain('allow write: if isAdmin()');
    });

    it('restringe escrita na coleção /announcements/{announcementId} apenas para ADMIN', () => {
      expect(rulesContent).toContain('match /announcements/{announcementId}');
      expect(rulesContent).toContain('allow write: if isAdmin()');
    });

    it('bloqueia escrita direta do cliente em /bookings/{bookingId} (apenas backend serverless)', () => {
      expect(rulesContent).toContain('match /bookings/{bookingId}');
      expect(rulesContent).toMatch(/match \/bookings\/\{bookingId\}[\s\S]*?allow write:\s*if false;/);
    });

    it('bloqueia escrita direta do cliente em /checkins/{checkinId} (apenas backend serverless)', () => {
      expect(rulesContent).toContain('match /checkins/{checkinId}');
      expect(rulesContent).toMatch(/match \/checkins\/\{checkinId\}[\s\S]*?allow write:\s*if false;/);
    });

    it('isola os leads de estandes por patrocinador em /leads/{sponsorId}/contacts/{contactId}', () => {
      expect(rulesContent).toContain('match /leads/{sponsorId}/contacts/{contactId}');
      expect(rulesContent).toContain('allow read: if isSponsor(sponsorId)');
    });

    it('possui regra de fallback fechada para bloquear coleções não mapeadas', () => {
      expect(rulesContent).toContain('match /{document=**}');
      expect(rulesContent).toContain('allow read, write: if false');
    });
  });
});

