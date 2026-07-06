WITH orders AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_orders"
),

customer_orders AS (
    SELECT
        customer_id,
        COUNT(order_id) AS total_orders_placed
    FROM orders
    -- Filter out null customer IDs to ensure calculations are valid
    WHERE customer_id IS NOT NULL AND customer_id != ''
    GROUP BY customer_id
),

classified_customers AS (
    SELECT
        customer_id,
        CASE
            WHEN total_orders_placed > 1 THEN 'Repeat Customer'
            ELSE 'Single-Order Customer'
        END AS customer_type
    FROM customer_orders
),

retention_counts AS (
    SELECT
        customer_type,
        COUNT(customer_id) AS customer_count
    FROM classified_customers
    GROUP BY customer_type
),

total_count AS (
    SELECT SUM(customer_count) AS total_customers FROM retention_counts
)

SELECT
    r.customer_type,
    r.customer_count,
    ROUND((r.customer_count * 100.0 / NULLIF(t.total_customers, 0)), 2) AS percentage
FROM retention_counts r
CROSS JOIN total_count t