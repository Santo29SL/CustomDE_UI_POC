WITH products AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_products"
),

pending_restocks AS (
    SELECT
        product_id,
        SUM(requested_quantity) AS total_pending_restock_qty,
        COUNT(restock_id) AS pending_restock_requests_count
    FROM "slinventoryDB"."silver"."stg_restocks"
    WHERE status = 'pending'
    GROUP BY product_id
)

SELECT
    p.product_id,
    p.product_name,
    p.category,
    p.quantity AS current_stock,
    p.reorder_level,
    CASE
        WHEN p.quantity = 0 THEN 'OUT OF STOCK'
        WHEN p.quantity <= p.reorder_level THEN 'LOW STOCK'
        ELSE 'HEALTHY'
    END AS stock_status,
    COALESCE(r.total_pending_restock_qty, 0) AS pending_restock_quantity,
    COALESCE(r.pending_restock_requests_count, 0) AS pending_restock_requests
FROM products p
LEFT JOIN pending_restocks r ON p.product_id = r.product_id
ORDER BY 
    CASE 
        WHEN p.quantity = 0 THEN 1
        WHEN p.quantity <= p.reorder_level THEN 2
        ELSE 3
    END ASC, 
    p.quantity ASC