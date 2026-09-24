import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import WhatsAppButton from './WhatsAppButton';

describe('WhatsAppButton component (KAN-54)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o botão com o label padrão', () => {
    render(<WhatsAppButton phone="34999998888" participantName="Carlos" companyName="Neospace" />);
    const btn = screen.getByRole('button', { name: /conversar no whatsapp/i });
    expect(btn).toBeDefined();
    expect(btn.disabled).toBe(false);
  });

  it('deve desabilitar o botão se o telefone for inválido', () => {
    render(<WhatsAppButton phone="invalido" participantName="Carlos" companyName="Neospace" />);
    const btn = screen.getByRole('button');
    expect(btn.disabled).toBe(true);
  });

  it('deve chamar window.open com o link formatado ao clicar', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <WhatsAppButton 
        phone="(34) 99999-8888" 
        participantName="Mariana" 
        companyName="Sankhya" 
        label="Falar com Recrutador"
      />
    );

    const btn = screen.getByRole('button', { name: /falar com recrutador/i });
    fireEvent.click(btn);

    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/5534999998888?text=Ol%C3%A1%2C%20Mariana!%20Foi%20um%20prazer%20conversar%20com%20voc%C3%AA%20no%20estande%20da%20Sankhya%20na%20FACOM%20TechWeek.',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
