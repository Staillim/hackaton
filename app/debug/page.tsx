'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [modelsList, setModelsList] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-gemini');
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const listModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch('/api/list-models');
      const data = await response.json();
      setModelsList(data);
    } catch (error: any) {
      setModelsList({
        success: false,
        error: error.message,
      });
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-800 rounded-2xl p-8 border border-zinc-700">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            🔍 Debug SmartBurger
          </h1>
          <p className="text-gray-400 mb-8">Panel de diagnóstico del sistema de chat</p>

          <div className="space-y-6">
            {/* Listar Modelos Disponibles */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                📋 Modelos Disponibles en tu API Key
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Primero verifica qué modelos están disponibles con tu API key
              </p>
              <button
                onClick={listModels}
                disabled={loadingModels}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {loadingModels ? '⏳ Cargando...' : '📋 Listar Modelos'}
              </button>

              {modelsList && (
                <div className="mt-6 space-y-4">
                  {modelsList.success ? (
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <div className="text-lg font-bold mb-3">
                        ✅ Encontrados: {modelsList.contentGenerationModels} modelos para chat
                      </div>
                      
                      {modelsList.models && modelsList.models.length > 0 ? (
                        <div className="space-y-3">
                          {modelsList.models.map((model: any, idx: number) => (
                            <div key={idx} className="bg-zinc-900 p-4 rounded-lg border border-green-500/30">
                              <div className="font-bold text-green-400">{model.name}</div>
                              <div className="text-sm text-gray-400 mt-1">{model.displayName}</div>
                              <div className="text-xs text-gray-500 mt-2">{model.description}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-red-900/20 p-4 rounded-lg border border-red-500 mt-3">
                          ⚠️ No se encontraron modelos compatibles con generateContent
                        </div>
                      )}

                      {modelsList.allModels && modelsList.allModels.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                            Ver todos los modelos ({modelsList.allModels.length})
                          </summary>
                          <div className="mt-2 text-xs bg-zinc-900 p-3 rounded">
                            {modelsList.allModels.map((name: string, idx: number) => (
                              <div key={idx} className="text-gray-400">{name}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-900/30 p-4 rounded-lg border border-red-500">
                      <div className="font-bold mb-2">❌ Error al listar modelos</div>
                      <div className="text-sm text-red-400">{modelsList.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Gemini */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                🤖 Test de Conexión Gemini
              </h2>
              <button
                onClick={runTest}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-600 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {loading ? '⏳ Probando...' : '▶️ Ejecutar Test'}
              </button>

              {testResult && (
                <div className="mt-6 space-y-4">
                  <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
                    <div className="text-lg font-bold mb-2">
                      {testResult.success ? '✅ Estado: FUNCIONANDO' : '❌ Estado: ERROR'}
                    </div>
                    <div className="text-sm opacity-80">{testResult.message}</div>
                  </div>

                  {testResult.tests && (
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
                      <h3 className="font-bold text-lg mb-3">📊 Resultados:</h3>
                      
                      <div className="flex items-center gap-3">
                        <span className={testResult.tests.apiKeyExists ? 'text-green-400' : 'text-red-400'}>
                          {testResult.tests.apiKeyExists ? '✅' : '❌'}
                        </span>
                        <span>API Key detectada</span>
                        {testResult.tests.apiKeyValue && (
                          <code className="text-xs bg-zinc-900 px-2 py-1 rounded">
                            {testResult.tests.apiKeyValue}
                          </code>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={testResult.tests.geminiConnection ? 'text-green-400' : 'text-red-400'}>
                          {testResult.tests.geminiConnection ? '✅' : '❌'}
                        </span>
                        <span>Conexión con Gemini</span>
                      </div>

                      {testResult.tests.responseText && (
                        <div className="bg-zinc-900 p-4 rounded-lg mt-4">
                          <div className="text-sm font-bold mb-2">💬 Respuesta de Gemini:</div>
                          <div className="text-green-400">{testResult.tests.responseText}</div>
                        </div>
                      )}

                      {testResult.tests.errorMessage && (
                        <div className="bg-red-900/20 p-4 rounded-lg mt-4 border border-red-500">
                          <div className="text-sm font-bold mb-2">⚠️ Error:</div>
                          <div className="text-red-400 font-mono text-xs">{testResult.tests.errorMessage}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variables de entorno */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                ⚙️ Variables de Entorno
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-64 text-gray-400">NEXT_PUBLIC_SUPABASE_URL:</span>
                  <code className="bg-zinc-800 px-3 py-1 rounded">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ No configurada'}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-64 text-gray-400">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                  <code className="bg-zinc-800 px-3 py-1 rounded">
                    {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                      ? `✅ ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
                      : '❌ No configurada'}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-64 text-gray-400">GEMINI_API_KEY:</span>
                  <code className="bg-zinc-800 px-3 py-1 rounded">
                    {/* Esta es server-side, no se ve aquí */}
                    🔒 Server-side (ver logs)
                  </code>
                </div>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                📋 Instrucciones
              </h2>
              <div className="space-y-3 text-sm">
                <p>1. <strong>Ejecuta el test de Gemini</strong> arriba para verificar la conexión</p>
                <p>2. <strong>Abre la Consola del Navegador</strong> (F12) para ver logs del frontend</p>
                <p>3. <strong>Abre la Terminal</strong> donde corre el servidor para ver logs del backend</p>
                <p>4. <strong>Prueba el chat</strong> en la página principal y observa los logs</p>
              </div>
            </div>

            {/* Links útiles */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-700">
              <h2 className="text-2xl font-bold mb-4">🔗 Links Útiles</h2>
              <div className="space-y-2">
                <a href="/" className="block text-red-400 hover:text-red-300">
                  ← Volver a la página principal
                </a>
                <a href="/admin" className="block text-red-400 hover:text-red-300">
                  📊 Panel Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
