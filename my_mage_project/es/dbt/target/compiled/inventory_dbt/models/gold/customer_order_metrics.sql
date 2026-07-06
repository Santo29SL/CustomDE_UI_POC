WITH orders AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_orders"
),

users AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_users"
)

SELECT
    u.name,
    u.email,
    AVG(o.total_amount) AS avg_order_value,
    MIN(o.total_amount) AS min_order_value,
    MAX(o.total_amount) AS max_order_value,
    COUNT(o.order_id) AS total_orders_placed,
    SUM(o.total_amount) AS total_amount_spent
FROM orders o
INNER JOIN users u ON o.customer_id = u.user_id
GROUP BY u.name, u.email