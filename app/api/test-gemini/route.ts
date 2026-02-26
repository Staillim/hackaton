import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST GEMINI - Iniciando prueba...');
  
  const tests = {
    apiKeyExists: false,
    apiKeyValue: '',
    geminiConnection: false,
    errorMessage: '',
    responseText: '',
  };

  try {
    // Test 1: Verificar que la API key existe
    if (process.env.GEMINI_API_KEY) {
      tests.apiKeyExists = true;
      tests.apiKeyValue = process.env.GEMINI_API_KEY.substring(0, 20) + '...';
      console.log('✅ API Key detectada');
    } else {
      console.log('❌ API Key NO detectada');
      tests.errorMessage = 'GEMINI_API_KEY no está configurada en .env.local';
      return NextResponse.json(tests);
    }

    // Test 2: Intentar conectar con Gemini
    console.log('🔌 Intentando conectar con Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 100,
      },
    });

    // Test 3: Hacer una pregunta simple
    console.log('💬 Enviando pregunta de prueba...');
    const result = await model.generateContent('Di hola en español y confirma que funciona correctamente');
    const response = await result.response;
    const text = response.text();
    
    tests.geminiConnection = true;
    tests.responseText = text;
    console.log('✅ Gemini respondió:', text);

    return NextResponse.json({
      success: true,
      message: '¡Gemini está funcionando correctamente! 🎉',
      tests,
    });

  } catch (error: any) {
    console.error('❌ Error en test:', error);
    tests.errorMessage = error.message || 'Error desconocido';
    
    return NextResponse.json({
      success: false,
      message: 'Error al conectar con Gemini',
      tests,
      error: error.message,
    });
  }
}
