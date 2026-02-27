# Script para ejecutar la migración de decisiones autónomas
# Este script ejecuta el SQL directamente en Supabase

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 MIGRACIÓN: Decisiones Autónomas IA" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Leer variables de entorno
if (!(Test-Path ".env.local")) {
    Write-Host "❌ Error: Archivo .env.local no encontrado" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content ".env.local" -Raw
$supabaseUrl = if ($envContent -match 'NEXT_PUBLIC_SUPABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
$serviceKey = if ($envContent -match 'SUPABASE_SERVICE_ROLE_KEY=(.+)') { $matches[1].Trim() } else { $null }

if (!$supabaseUrl -or !$serviceKey) {
    Write-Host "❌ Error: No se encontraron las credenciales de Supabase en .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Credenciales cargadas" -ForegroundColor Green
Write-Host "📍 Supabase URL: $($supabaseUrl.Substring(0, 30))..." -ForegroundColor Gray
Write-Host ""

# Leer el archivo SQL
$sqlFile = "supabase/migration-autonomous-decisions.sql"
if (!(Test-Path $sqlFile)) {
    Write-Host "❌ Error: Archivo de migración no encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Leyendo migración SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw
Write-Host "✅ Migración cargada ($(($sqlContent -split "`n").Count) líneas)" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  IMPORTANTE: Esta migración agregará:" -ForegroundColor Yellow
Write-Host "   • Campos margin_percentage y stock_quantity a productos" -ForegroundColor Gray
Write-Host "   • Tabla user_behavior_analytics" -ForegroundColor Gray
Write-Host "   • Función get_smart_recommendations" -ForegroundColor Gray
Write-Host "   • Vista dashboard_metrics" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "¿Deseas continuar con la migración? (si/no)"
if ($confirmation -ne "si") {
    Write-Host "❌ Migración cancelada por el usuario" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Ejecutando migración..." -ForegroundColor Cyan

# Ejecutar la migración usando la REST API de Supabase
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

# Nota: Supabase no tiene un endpoint directo para ejecutar SQL arbitrario via REST
# La mejor forma es usar el SQL Editor en el dashboard o usar la CLI
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "⚠️  INSTRUCCIONES MANUALES" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ejecutar esta migración, sigue estos pasos:" -ForegroundColor White
Write-Host ""
Write-Host "OPCIÓN 1: SQL Editor (Recomendado):" -ForegroundColor Cyan
Write-Host "1. Abre: $supabaseUrl" -ForegroundColor Gray
Write-Host "2. Ve a SQL Editor en el menú lateral" -ForegroundColor Gray
Write-Host "3. Copia el contenido de: supabase/migration-autonomous-decisions.sql" -ForegroundColor Gray
Write-Host "4. Pégalo en el editor y haz clic en 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCIÓN 2: psql (Terminal):" -ForegroundColor Cyan
Write-Host "psql 'postgresql://...' -f supabase/migration-autonomous-decisions.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCIÓN 3: Supabase CLI:" -ForegroundColor Cyan
Write-Host "supabase db push" -ForegroundColor Gray
Write-Host ""

# Copiar SQL al portapapeles si está disponible
if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
    $sqlContent | Set-Clipboard
    Write-Host "✅ SQL copiado al portapapeles. Puedes pegarlo directamente en SQL Editor." -ForegroundColor Green
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Presiona cualquier tecla para abrir SQL Editor en el navegador..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Abrir el SQL Editor en el navegador
$dashboardUrl = $supabaseUrl -replace 'https://', 'https://app.supabase.com/project/'
$projectId = ($supabaseUrl -split '\.')[0] -replace 'https://', ''
$sqlEditorUrl = "https://app.supabase.com/project/$projectId/sql/new"

Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "✅ SQL Editor abierto en el navegador" -ForegroundColor Green
Write-Host "📋 El SQL está copiado en tu portapapeles - Ctrl+V para pegar" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cuando termines, ejecuta: npm run dev" -ForegroundColor Yellow
Write-Host ""
