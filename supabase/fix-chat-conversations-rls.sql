-- ============================================
-- FIX: RLS para chat_conversations
-- ============================================
-- Problema: Política de seguridad bloqueaba INSERT
-- Solución: Permitir crear/leer conversaciones públicamente

-- Verificar tabla existente
SELECT * FROM chat_conversations LIMIT 1;

-- Habilitar RLS si no está habilitado
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan causar conflicto
DROP POLICY IF EXISTS "Allow public insert" ON chat_conversations;
DROP POLICY IF EXISTS "Allow public select" ON chat_conversations;
DROP POLICY IF EXISTS "Allow public update" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can view conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON chat_conversations;

-- Crear políticas permisivas (necesario para chat sin autenticación)
CREATE POLICY "Anyone can create conversations"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view conversations"
  ON chat_conversations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update conversations"
  ON chat_conversations
  FOR UPDATE
  USING (true);

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'chat_conversations';

-- Resultado esperado:
-- ✅ Anyone can create conversations | FOR INSERT
-- ✅ Anyone can view conversations | FOR SELECT  
-- ✅ Anyone can update conversations | FOR UPDATE

-- ============================================
-- TESTING
-- ============================================

-- Test 1: Crear conversación de prueba
INSERT INTO chat_conversations (session_id, user_email, messages)
VALUES (
  'test-session-' || gen_random_uuid(),
  'test@example.com',
  '[{"role": "user", "content": "Hola", "timestamp": "2024-02-27T10:00:00Z"}]'::jsonb
);

-- Test 2: Verificar que se creó
SELECT 
  session_id,
  user_email,
  jsonb_array_length(messages) as message_count,
  created_at
FROM chat_conversations
WHERE user_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Test 3: Actualizar (UPSERT pattern)
INSERT INTO chat_conversations (session_id, user_email, messages)
VALUES (
  'test-session-123',
  'test2@example.com',
  '[{"role": "user", "content": "Test mensaje"}]'::jsonb
)
ON CONFLICT (session_id)
DO UPDATE SET
  messages = chat_conversations.messages || EXCLUDED.messages,
  updated_at = NOW();

-- Limpiar tests
DELETE FROM chat_conversations WHERE user_email IN ('test@example.com', 'test2@example.com');

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- ✅ INSERT funciona sin errores de RLS
-- ✅ SELECT retorna las conversaciones
-- ✅ UPDATE/UPSERT funciona correctamente
-- ✅ No más error: "new row violates row-level security policy"
