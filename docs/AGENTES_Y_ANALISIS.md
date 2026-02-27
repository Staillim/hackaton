# Agentes y Análisis — Funcionalidades, preguntas técnicas y guía práctica

Este documento resume las funcionalidades de los dos agentes del sistema, preguntas técnicas frecuentes sobre la aplicación, y explicaciones accesibles sobre embeddings y modelos de lenguaje grande (LLMs). También cubre cómo encajan estas tecnologías en nuestro proyecto, captura de datos, métricas clave, microsegmentación y scoring de churn. Las explicaciones son técnicas pero no a profundidad, pensadas para equipos de producto y devs.

---

## 1) Resumen ejecutivo
- Agente A (Chat / Conversacional): gestiona conversaciones con clientes, respuestas automáticas, recuperación de contexto y recomendaciones personalizadas.
- Agente B (Admin / Automatización): ejecuta acciones administrativas (análisis batch, triggers de promociones, gestión de inventario/alertas), orquesta pipelines y alimenta datos al agente conversacional.

Ambos agentes colaboran: el Agente B prepara y etiqueta datos, segmenta usuarios y dispara campañas; el Agente A usa esos datos (y retrieval/embeddings) para respuestas más relevantes y personalizadas.

---

## 2) Funcionalidades por agente

- Agente A — Conversacional
  - Chat multicanal (web, in-app, API).
  - Contexto de sesión: mantiene contexto corto y usa RAG (retrieval-augmented generation) para contexto largo.
  - Respuestas personalizadas según perfil y preferencias (idioma, tono, frecuencia).
  - Recomendaciones de productos y promociones (baseline + reranking por scoring).
  - Manejo de fallback y escalado a humano.

- Agente B — Administración / Orquestador
  - Segmentación y microsegmentación basada en comportamiento.
  - Cálculo de métricas: ticket promedio, recurrencia, conversión por campaña.
  - Triggers automáticos (p. ej. re-engagement, abandono de carrito) y envío de campañas.
  - Análisis y ETL: limpieza, agregación y almacenado en vectores para retrieval.
  - Gestión de reglas RLS/seguridad y rotación de keys.

---

## 3) Preguntas técnicas frecuentes (Q&A)

- P: ¿Cómo se integran los agentes con la base de datos (Supabase)?
  - R: Lecturas y escrituras via client/REST o RPC; writes sensibles con service_role key en backend; RLS activas para seguridad.

- P: ¿Cómo hacer despliegues seguros y migraciones de DB?
  - R: Usar scripts SQL versionados (`supabase/*.sql`), ejecutar en staging y luego prod; usar backups antes de aplicar cambios.

- P: ¿Cómo protegemos las claves y limits de llamadas a LLMs? 
  - R: Guardar keys en Secrets manager / env vars, usar rate limiting y caching de respuestas frecuentes.

- P: ¿Cómo validar que el perfil de usuario existe antes de editarlo? 
  - R: Validar existencia en `user_profiles` y aplicar fallback UX si tabla ausente; migraciones automatizadas en CI para evitar inconsistencias.

- P: ¿Qué métricas monitorear para campañas? 
  - R: CTR, CR (conversion rate), AOV (average order value / ticket promedio), recurrencia (repeat purchase rate), churn rate por cohorte.

---

## 4) Embeddings y modelos LLM — explicaciones sencillas

- Embeddings: vectores numéricos que representan texto (o ítems) en un espacio continuo; textos semánticamente similares quedan cerca entre sí.
- Vector DB: almacena embeddings para búsqueda por similitud (nearest neighbors) — p. ej. Pinecone, Milvus, Weaviate, o tablas con índices especializados.
- LLMs: modelos de lenguaje grande (GPT, Llama, etc.) que generan texto condicionalmente; buenos para formular respuestas, resumir y fusionar información.

Pipeline típico (RAG):
  1. Indexar contenidos relevantes (FAQ, descripción de productos, historial conversacional) como embeddings.
  2. Al recibir una consulta, convertirla a embedding y buscar k vecinos en vector DB.
  3. Construir prompt con esos documentos (contexto) + instrucciones y enviar a LLM.
  4. Reranking y post-procesado (shorten, sanitize, aplicar reglas de negocio).

Ventajas: respuestas más precisas y actualizables sin reentrenar el LLM (solo reindexar). Trade-offs: latencia, coste por token y necesidad de mantener la calidad de la base de conocimiento.

---

## 5) Cómo encaja esto en nuestro proyecto

- Uso directo: recomendaciones en chat, respuestas a preguntas sobre pedidos/inventario, resúmenes de promociones.
- Personalización: combinar embeddings de contenido con perfil (user embedding) para recuperar contenido que coincida con intereses del usuario.
- Arquitectura sugerida:
  - Frontend → (API) → Backend Orquestador (Agente B) → Vector DB + Supabase → LLM provider.
  - Cache de prompts y respuestas frecuentes para reducir coste.

Consideraciones de ajuste:
  - Decidir si usar LLMs hosted (API) o self-hosted según coste y latencia.
  - Mantener pipelines ETL que refresquen los embeddings automáticamente cuando cambien productos o promociones.

---

## 6) Escalabilidad de mensajes personalizados

- Patrones de escala:
  - Asincronía: generar mensajes en background (jobs) para lotes grandes.
  - Sharding de vector DB y particionado por tenant/segmento.
  - Caching de resultados por usuario y por plantilla.
  - Rate limits y backoff para llamadas a LLMs.

- Cost control:
  - Pre-rankear candidatos con modelos ligeros (p. ej. heurísticos o small transformer) antes de llamar a LLM.
  - Usar templates parametrizados para reducir tokens pasados al LLM.

---

## 7) Captura de datos y métricas (qué y cómo)

- Eventos a capturar:
  - Interacciones de chat (mensaje, timestamp, intent identificado).
  - Respuestas a campañas (open, click, conversion).
  - Compras: ticket total, items, canal.
  - Comportamiento: vistas, búsquedas, tiempo en página.

- Métricas derivadas:
  - Ticket promedio (AOV): total ventas / número de pedidos.
  - Recurrencia: % clientes con >1 compra en periodo N.
  - Promedio por campaña: conversiones / envíos.

- Implementación:
  - Events stream a un sistema central (p. ej. Postgres + ETL a data-warehouse o pipeline a BigQuery).
  - Enriquecer eventos con user_id, segment_id, campaña_id y metadata (source, device).

Privacidad: anonimizar PII en pipelines analíticos y cumplir GDPR/CPRA según target.

---

## 8) Promociones: modelado y respuesta

- Modelado de promociones:
  - Definir reglas de elegibilidad (RFM, inventario, historial de respuesta).
  - Definir frecuencia (frequency capping) y ventanas de validez.

- Respuestas y medición:
  - Enviar variante A/B, registrar CTR/CR y ticket promedio posterior.
  - Medir lift: comparar cohortes expuestas vs control.

- Ejemplos de triggers:
  - Carrito abandonado → 24h recordatorio + 10% off si no compró en 48h.
  - Cliente de alta recurrencia → oferta exclusiva por tiempo limitado.

---

## 9) Patrones, microsegmentación y acciones

- Microsegmentos comunes:
  - RFM buckets (Recency / Frequency / Monetary).
  - Afinidad por categoría o marca (productos vistos/comprados).
  - Engagement: opens, clicks, tiempo de sesión.

- Acciones por segmento:
  - Alta probabilidad compra: notificaciones in-app con recomendación personalizada.
  - Riesgo de churn: campaña de retención con cupón + mensaje humano.
  - Segmentos VIP: early-access a promociones.

---

## 10) Scoring de churn — explicación simple

- Qué es: una puntuación que estima la probabilidad de que un cliente deje de comprar.
- Entradas típicas: recency (días desde última compra), frequency (nº compras), monetary (gasto), engagement events, soporte tickets.
- Salida: probabilidad continua (0..1) o bucket (alto/medio/bajo).
- Uso: definir umbrales para acciones automáticas (p. ej. si churn_prob > 0.7 → disparar campaña de retención).

---

## 11) Buenas prácticas y consideraciones

- Monitoreo: trackear latencia de retrieval + LLM, coste por llamada, tasa de errores y calidad (human-in-the-loop evaluación).
- Seguridad: service_role keys solo server-side; rotate keys y limitar permisos.
- Evaluación de modelos: A/B testing de templates y control de deriva (drift) en datos de usuario.
- Gobernanza: mantener catálogo de prompts, plantillas y versión de embeddings.

---

## 12) Recomendaciones rápidas (siguientes pasos)
- Crear pipeline de ingestión para actualizar embeddings cuando cambien productos/promos.
- Implementar métricas básicas (CTR, CR, AOV) y dashboards para seguimiento.
- Resolver migración `user_profiles` en Supabase en staging antes de prod.
- Priorizar resolver conflictos en `app/api/admin/chat/route.ts` y luego desplegar.

---

## 13) Implementación actual — agentes y contexto

### Agente A: Conversacional (María)
- **Descripción**: María es el agente conversacional que interactúa con los usuarios finales. Gestiona el contexto de las conversaciones, personaliza respuestas y realiza recomendaciones basadas en datos.
- **Integración con la BD**:
  - Lectura de historial de chat: `getChatHistory`.
  - Recuperación de preferencias: `getUserPreferences`.
  - Acceso a productos y stock: `getBestSellingProducts`, `getProductsByNames`.
  - Actualización de likes explícitos: `saveExplicitLike`.
- **Manejo del contexto**:
  - Contexto corto: historial de chat y carrito actual.
  - Contexto largo: recuperación de datos relevantes (productos, preferencias) y construcción de prompts dinámicos.
  - Ejemplo de prompt dinámico:
    ```
    🛒 CARRITO ACTUAL DEL USUARIO (2 items - Total: $25.99):
    - Burger Clásica x1 (+queso extra)
    - Papas Fritas x1

    🎯 PREFERENCIAS AVANZADAS DEL USUARIO:
    - Productos favoritos: Burger Clásica (50%), Papas Fritas (30%)
    - Siempre agrega: queso extra
    - Nunca ordena: bebidas azucaradas

    ¿Qué te gustaría agregar o cambiar en tu orden?
    ```
- **Ejemplo de funcionalidad**: Recomendación personalizada.
  - Entrada: "Quiero algo con pollo."
  - Respuesta: "Te recomiendo nuestra Burger de Pollo ($8.99). ¿La agrego a tu orden?"

### Agente B: Administrativo (Max)
- **Descripción**: Max es el analista de negocio que asiste al equipo administrativo. Genera insights basados en métricas y datos agregados.
- **Integración con la BD**:
  - Recuperación de métricas: `getAdminMetrics`.
  - Análisis de stock crítico, ventas por producto y promociones activas.
- **Manejo del contexto**:
  - Generación de insights con OpenAI GPT-4o-mini.
  - Ejemplo de prompt:
    ```
    Eres Max, el analista de negocio de SmartBurger.

    PERSONALIDAD:
    - Directo y preciso. Sin frases de relleno ni elogios vacíos.
    - Hablas con datos específicos, no con generalidades.
    - Cuando algo está mal, lo dices primero, sin suavizarlo.

    MÉTRICAS:
    - Productos vendidos: 120
    - Alertas de stock crítico: 5
    - Promociones activas: 3

    ¿Qué insights puedes generar?
    ```
- **Ejemplo de funcionalidad**: Generación de alertas de stock.
  - Entrada: Métricas de stock crítico.
  - Respuesta: "5 productos con stock crítico: Burger Clásica (5 unidades), Papas Fritas (2 unidades)."

---
