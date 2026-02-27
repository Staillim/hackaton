/**
 * Detecta menciones explícitas de gustos en mensajes del usuario
 * para guardarlas en BD y reducir costos de API
 */

export interface DetectedPreference {
  item: string;
  context: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detecta frases como "me gusta X", "me encanta X", "siempre pido X"
 */
export function detectExplicitLikes(message: string): DetectedPreference[] {
  const detected: DetectedPreference[] = [];
  const messageLower = message.toLowerCase();

  // Patrones de gustos explícitos (ordenados por confianza)
  const patterns = [
    // Alta confianza
    { regex: /me (?:gusta mucho|encanta|fascina|apasiona)\s+(?:el|la|los|las)?\s*([a-záéíóúñ\s]+?)(?:\s+(?:y|,$|$|\.|!|¿|\?))/gi, confidence: 'high' as const },
    { regex: /(?:siempre|normalmente|generalmente) (?:pido|ordeno|como)\s+(?:el|la|los|las)?\s*([a-záéíóúñ\s]+?)(?:\s+(?:y|,$|$|\.|!|¿|\?))/gi, confidence: 'high' as const },
    
    // Confianza media
    { regex: /me (?:gusta|agrada|cae bien)\s+(?:el|la|los|las)?\s*([a-záéíóúñ\s]+?)(?:\s+(?:y|,$|$|\.|!|¿|\?))/gi, confidence: 'medium' as const },
    { regex: /(?:prefiero|me quedo con)\s+(?:el|la|los|las)?\s*([a-záéíóúñ\s]+?)(?:\s+(?:y|,$|$|\.|!|¿|\?))/gi, confidence: 'medium' as const },
    
    // Confianza baja (más ambiguo)
    { regex: /(?:quiero|dame|deme)\s+(?:el|la|los|las)?\s*([a-záéíóúñ\s]+?)(?:\s+(?:siempre|cada vez))/gi, confidence: 'low' as const },
  ];

  for (const { regex, confidence } of patterns) {
    let match;
    regex.lastIndex = 0; // Resetear regex
    
    while ((match = regex.exec(messageLower)) !== null) {
      const item = match[1].trim();
      
      // Validar que el item no sea muy corto o muy largo
      if (item.length < 3 || item.length > 50) continue;
      
      // Validar que no sea una palabra común sin sentido
      const stopWords = ['algo', 'esto', 'eso', 'aquello', 'una', 'un', 'unos', 'unas'];
      if (stopWords.includes(item)) continue;
      
      // Capitalizar primera letra de cada palabra
      const itemFormatted = item
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      detected.push({
        item: itemFormatted,
        context: match[0].trim(),
        confidence
      });
    }
  }

  return detected;
}

/**
 * Convierte preferencias detectadas a formato para enviar al prompt de la IA
 */
export function formatPreferencesForPrompt(preferences: DetectedPreference[]): string {
  if (preferences.length === 0) return '';

  const highConfidence = preferences.filter(p => p.confidence === 'high');
  const mediumConfidence = preferences.filter(p => p.confidence === 'medium');

  let text = '\n\n🎯 GUSTOS MENCIONADOS POR EL USUARIO (acaba de decir):';
  
  if (highConfidence.length > 0) {
    text += `\n✅ Le ENCANTA: ${highConfidence.map(p => p.item).join(', ')}`;
  }
  
  if (mediumConfidence.length > 0) {
    text += `\n👍 Le gusta: ${mediumConfidence.map(p => p.item).join(', ')}`;
  }
  
  text += '\n💡 Usa esto para personalizar tu respuesta AHORA (no esperes al siguiente mensaje)';
  
  return text;
}

/**
 * Ejemplos de detección para testing
 */
export function testDetection() {
  const testCases = [
    'hola me gustarian unos aros de cebolla con una doble queso deluxe ah y una cocacola me gusta mucho la cocacola',
    'quiero una hamburguesa, siempre pido pepinillos extras',
    'me encanta el aguacate así que ponle bastante',
    'prefiero la sprite a la coca-cola',
    'normalmente ordeno papas fritas con mi combo',
  ];

  console.log('Testing preference detection:');
  testCases.forEach((msg, i) => {
    console.log(`\n[Test ${i + 1}] "${msg}"`);
    const detected = detectExplicitLikes(msg);
    console.log('Detected:', detected);
  });
}
