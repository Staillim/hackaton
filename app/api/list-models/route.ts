import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('📋 Listando modelos disponibles...');
  
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY no configurada'
      }, { status: 500 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');

    // Intentar listar modelos usando la API REST directamente
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return NextResponse.json({
        error: 'Error al listar modelos',
        status: response.status,
        details: errorText,
      });
    }

    const data = await response.json();
    console.log('✅ Modelos obtenidos:', data);

    // Filtrar solo modelos que soportan generateContent
    const contentModels = data.models?.filter((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    ) || [];

    return NextResponse.json({
      success: true,
      totalModels: data.models?.length || 0,
      contentGenerationModels: contentModels.length,
      models: contentModels.map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        methods: m.supportedGenerationMethods,
      })),
      allModels: data.models?.map((m: any) => m.name) || [],
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
