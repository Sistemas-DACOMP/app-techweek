#!/usr/bin/env node
/**
 * Script de Importação Automática de Tarefas no Jira via REST API v3
 * 
 * Como usar:
 * 1. Gere seu API Token no Jira em: https://id.atlassian.com/manage-profile/security/api-tokens
 * 2. Execute com suas credenciais:
 *    JIRA_DOMAIN="sua-empresa.atlassian.net" \
 *    JIRA_EMAIL="seu-email@ufu.br" \
 *    JIRA_API_TOKEN="seu-token-aqui" \
 *    JIRA_PROJECT_KEY="KAN" \
 *    node scripts/jira-api-sync.mjs
 */

import { readFileSync } from 'node:fs';

const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'KAN';

if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.log(`
========================================================================
🚀 JIRA API SYNC - TECH WEEK
========================================================================
Para criar automaticamente as tarefas no Jira via API, execute:

JIRA_DOMAIN="seu-jira.atlassian.net" \\
JIRA_EMAIL="seu-email@gmail.com" \\
JIRA_API_TOKEN="seu-token" \\
JIRA_PROJECT_KEY="KAN" \\
node scripts/jira-api-sync.mjs

Como obter o JIRA_API_TOKEN:
Acesse: https://id.atlassian.com/manage-profile/security/api-tokens e clique em "Create API token".
========================================================================
`);
  process.exit(0);
}

const authHeader = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const baseUrl = `https://${JIRA_DOMAIN.replace(/^https?:\/\//, '')}/rest/api/3`;

async function getProjectIssueTypes() {
  const res = await fetch(`${baseUrl}/project/${JIRA_PROJECT_KEY}`, {
    headers: { Authorization: authHeader, Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar projeto ${JIRA_PROJECT_KEY}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.issueTypes || [];
}

async function createIssue(issueData, taskTypeId) {
  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: issueData.summary,
      issuetype: { id: taskTypeId },
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: issueData.description }]
          }
        ]
      },
      labels: issueData.labels ? issueData.labels.split(',') : []
    }
  };

  const res = await fetch(`${baseUrl}/issue`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Erro ao criar "${issueData.summary}":`, err);
    return null;
  }

  const created = await res.json();
  console.log(`✅ [${created.key}] Criada com sucesso: ${issueData.summary}`);
  return created;
}

async function main() {
  console.log(`📡 Conectando ao Jira em https://${JIRA_DOMAIN}...`);
  const issueTypes = await getProjectIssueTypes();
  const taskType = issueTypes.find(t => t.name.toLowerCase().includes('task') || t.name.toLowerCase().includes('tarefa')) || issueTypes[0];

  console.log(`🎯 Tipo de Issue selecionado: ${taskType.name} (ID: ${taskType.id})`);

  // Lê o CSV
  const csvContent = readFileSync(new URL('../docs/jira_import_v2.csv', import.meta.url), 'utf8');
  const lines = csvContent.split('\n').filter(Boolean);
  
  // Pula cabeçalho
  const rows = lines.slice(1);
  console.log(`📦 Encontradas ${rows.length} tarefas para importar...\n`);

  for (const row of rows) {
    const parts = row.split('","');
    if (parts.length >= 2) {
      const summary = parts[1].replace(/^"/, '');
      const description = parts[2] || '';
      const labels = parts[5] ? parts[5].replace(/"$/, '') : '';
      
      await createIssue({ summary, description, labels }, taskType.id);
      // Pequeno delay para respeitar rate limits do Jira
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log('\n🎉 Todas as tarefas foram criadas no Jira!');
}

main().catch(console.error);

