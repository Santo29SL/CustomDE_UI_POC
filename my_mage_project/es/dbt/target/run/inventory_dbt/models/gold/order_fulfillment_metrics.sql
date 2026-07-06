
  
    

  create  table "slinventoryDB"."gold"."order_fulfillment_metrics__dbt_tmp"
  
  
    as
  
  (
    WITH orders AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_orders"
),

totals AS (
    SELECT COUNT(*) AS grand_total_orders FROM orders
)

SELECT
    o.status,
    COUNT(o.order_id) AS total_orders,
    SUM(o.quantity) AS total_units,
    SUM(o.total_amount) AS total_revenue,
    ROUND((COUNT(o.order_id) * 100.0 / NULLIF(t.grand_total_orders, 0)), 2) AS percentage_of_total_orders
FROM orders o
CROSS JOIN totals t
GROUP BY o.status, t.grand_total_orders
ORDER BY total_orders DESC
  );
  