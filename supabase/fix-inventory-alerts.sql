-- ============================================
-- FIX: Auto-resolver alertas cuando el stock mejora
-- ============================================

-- Función mejorada para verificar stock y gestionar alertas
CREATE OR REPLACE FUNCTION check_ingredient_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el stock está bajo o agotado, crear alerta (si no existe una activa)
    IF NEW.stock_quantity <= NEW.min_stock_alert THEN
        -- Solo crear alerta si no hay una activa para este ingrediente
        IF NOT EXISTS (
            SELECT 1 FROM inventory_alerts 
            WHERE ingredient_id = NEW.id 
            AND resolved = false
        ) THEN
            INSERT INTO inventory_alerts (ingredient_id, alert_type, message)
            VALUES (
                NEW.id,
                CASE WHEN NEW.stock_quantity = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
                'Stock bajo para ' || NEW.name
            );
        END IF;
    
    -- Si el stock volvió a niveles normales, resolver alertas activas
    ELSIF NEW.stock_quantity > NEW.min_stock_alert THEN
        UPDATE inventory_alerts
        SET 
            resolved = true,
            resolved_at = NOW()
        WHERE 
            ingredient_id = NEW.id 
            AND resolved = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger (por si acaso)
DROP TRIGGER IF EXISTS check_stock_trigger ON ingredients;
CREATE TRIGGER check_stock_trigger 
AFTER UPDATE OF stock_quantity ON ingredients
FOR EACH ROW 
EXECUTE FUNCTION check_ingredient_stock();

-- ============================================
-- Resolver todas las alertas obsoletas actuales
-- ============================================
-- Marcar como resueltas las alertas donde el stock ya no está bajo
UPDATE inventory_alerts ia
SET 
    resolved = true,
    resolved_at = NOW()
FROM ingredients i
WHERE 
    ia.ingredient_id = i.id
    AND ia.resolved = false
    AND i.stock_quantity > i.min_stock_alert;

-- Verificar resultado
SELECT 
    'Alertas resueltas:' as resultado,
    COUNT(*) as cantidad
FROM inventory_alerts
WHERE resolved = true;
