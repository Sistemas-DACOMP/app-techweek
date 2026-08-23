// Cria a conta de teste "admin" usada pelo atalho de login em src/pages/Login.jsx
// (digitar "admin" no campo de e-mail loga como admin@admin.com).
//
// O e-mail fica fixo abaixo de propósito — precisa bater com o atalho hardcoded
// no Login.jsx. A senha NÃO tem valor padrão: defina SEED_ADMIN_PASSWORD antes
// de rodar, combinada à parte com o time (nunca commitar o valor real).
//
// Uso (lê a URL/chave do Supabase do mesmo .env.local do app, então sempre
// aponta pro ambiente certo):
//   PowerShell: $env:SEED_ADMIN_PASSWORD="senha-forte-aqui"; node --env-file=.env.local scripts/seed-admin.js
//   bash:       SEED_ADMIN_PASSWORD="senha-forte-aqui" node --env-file=.env.local scripts/seed-admin.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas (rode com --env-file=.env.local).');
}
if (!adminPassword) {
  throw new Error('SEED_ADMIN_PASSWORD precisa estar definida — este script não usa mais uma senha fixa.');
}

async function seedAdmin() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Seeding admin user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@admin.com',
    password: adminPassword,
    options: {
      data: {
        username: 'admin',
        first_name: 'Admin',
        last_name: 'Sistema',
      },
    },
  });

  if (error) {
    console.error('Error creating admin:', error.message);
  } else {
    console.log('Admin created successfully!', data.user.id);
  }
}

seedAdmin();
