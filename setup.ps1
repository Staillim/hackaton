# Script de Setup Rápido para SmartBurger
# Ejecutar: .\setup.ps1

Write-Host "🍔 SmartBurger - Script de Configuración" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js no está instalado." -ForegroundColor Red
    Write-Host "   Por favor instala Node.js desde: https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Instalar dependencias
Write-Host "📥 Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
Write-Host ""

# Verificar si existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  El archivo .env.local ya existe" -ForegroundColor Yellow
    $response = Read-Host "¿Deseas sobrescribirlo? (s/N)"
    if ($response -eq "s" -or $response -eq "S") {
        Copy-Item ".env.local.example" ".env.local" -Force
        Write-Host "✅ Archivo .env.local creado" -ForegroundColor Green
    }
} else {
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "✅ Archivo .env.local creado desde el ejemplo" -ForegroundColor Green
}
Write-Host ""

# Instrucciones
Write-Host "📝 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configura tus variables de entorno en .env.local:" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "   - OPENAI_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Crea tu proyecto en Supabase:" -ForegroundColor White
Write-Host "   - Ve a https://supabase.com" -ForegroundColor Gray
Write-Host "   - Crea un nuevo proyecto" -ForegroundColor Gray
Write-Host "   - Ejecuta los scripts SQL en supabase/schema.sql y supabase/seed.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Obtén tu API Key de OpenAI:" -ForegroundColor White
Write-Host "   - Ve a https://platform.openai.com" -ForegroundColor Gray
Write-Host "   - Crea una nueva API Key" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Inicia el servidor de desarrollo:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Para más detalles, consulta SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ ¡Todo listo! Feliz desarrollo 🚀" -ForegroundColor Green
