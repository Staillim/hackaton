#!/usr/bin/env node

/**
 * SmartBurger - Setup Automático de Base de Datos
 * 
 * Este script te guiará para configurar tu base de datos de Supabase
 */

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
console.log(`
╔═══════════════════════════════════════════════════════╗
║     🍔 SMARTBURGER - CONFIGURACIÓN DE DATABASE        ║
╚═══════════════════════════════════════════════════════╝

📊 Tu proyecto: zcbwbxjeyhzolnjsorkf
🌐 URL: https://zcbwbxjeyhzolnjsorkf.supabase.co
✅ Contraseña: [Configurada]
`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('🔑 PASO 1: Obtener las API Keys\n');
  console.log('Abre este link en tu navegador:');
  console.log('👉 https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/settings/api\n');
  
  await askQuestion('Presiona ENTER cuando hayas abierto el link...');
  
  console.log('\n📋 Ahora verás dos keys importantes:\n');
  
  // Pedir anon key
  const anonKey = await askQuestion('1️⃣  Pega tu ANON KEY (anon/public): ');
  
  // Pedir service role key
  const serviceKey = await askQuestion('2️⃣  Pega tu SERVICE ROLE KEY: ');
  
  // Actualizar .env.local
  console.log('\n💾 Guardando configuración en .env.local...');
  
  let envContent = fs.readFileSync('.env.local', 'utf8');
  envContent = envContent.replace('NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI', `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey.trim()}`);
  envContent = envContent.replace('SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI', `SUPABASE_SERVICE_ROLE_KEY=${serviceKey.trim()}`);
  
  fs.writeFileSync('.env.local', envContent);
  
  console.log('✅ Configuración guardada!\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 PASO 2: Ejecutar Scripts SQL\n');
  console.log('Abre este link para el SQL Editor:');
  console.log('👉 https://supabase.com/dashboard/project/zcbwbxjeyhzolnjsorkf/sql/new\n');
  
  await askQuestion('Presiona ENTER cuando hayas abierto el editor SQL...');
  
  console.log('\n📝 Instrucciones:\n');
  console.log('1. En el SQL Editor, copia y pega el contenido de:');
  console.log('   📄 supabase/schema.sql');
  console.log('2. Click en "RUN" (botón verde)');
  console.log('3. Espera a que termine (verás "Success")');
  console.log('4. Luego copia y pega:');
  console.log('   📄 supabase/seed.sql');
  console.log('5. Click en "RUN" nuevamente\n');
  
  await askQuestion('Presiona ENTER cuando hayas ejecutado ambos scripts...');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 ¡CONFIGURACIÓN COMPLETA!\n');
  console.log('🚀 Para iniciar tu aplicación:\n');
  console.log('   npm run dev\n');
  console.log('Luego abre: http://localhost:3000\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  rl.close();
}

setup().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
