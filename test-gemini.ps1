# Script para probar la API Key de Gemini
Write-Host "🧪 Probando Gemini API Key..." -ForegroundColor Cyan
Write-Host ""

# Leer API Key del archivo .env.local
$envFile = Get-Content ".env.local" | Where-Object { $_ -match "^GEMINI_API_KEY=" }
$apiKey = ($envFile -split "=")[1].Trim()

if ([string]::IsNullOrEmpty($apiKey)) {
    Write-Host "❌ ERROR: No se encontró GEMINI_API_KEY en .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "🔑 API Key encontrada: $($apiKey.Substring(0, 20))..." -ForegroundColor Yellow
Write-Host ""

# Crear body de petición
$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "Di solo 'funciona' en una palabra"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

# URL de la API
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey"

try {
    Write-Host "🚀 Enviando petición a Gemini..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    $text = $response.candidates[0].content.parts[0].text
    
    Write-Host ""
    Write-Host "✅ ¡API KEY FUNCIONA CORRECTAMENTE!" -ForegroundColor Green
    Write-Host "📝 Respuesta de Gemini: $text" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Ahora puedes iniciar el servidor con: npm run dev" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: La API Key no funciona" -ForegroundColor Red
    Write-Host "📋 Detalles del error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    
    if ($_.Exception.Message -match "403") {
        Write-Host "🔴 API Key bloqueada o inválida" -ForegroundColor Red
        Write-Host "💡 Genera una nueva en: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
    } elseif ($_.Exception.Message -match "429") {
        Write-Host "⚠️  API Key válida pero alcanzaste el límite de cuota" -ForegroundColor Yellow
        Write-Host "💡 Espera unos minutos o genera una nueva API key" -ForegroundColor Cyan
    } else {
        Write-Host "💡 Verifica tu conexión a Internet o genera una nueva API key" -ForegroundColor Cyan
    }
    
    exit 1
}
