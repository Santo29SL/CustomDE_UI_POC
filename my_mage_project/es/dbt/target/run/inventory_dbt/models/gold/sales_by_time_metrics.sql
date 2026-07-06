
  
    

  create  table "slinventoryDB"."gold"."sales_by_time_metrics__dbt_tmp"
  
  
    as
  
  (
    WITH orders AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_orders"
),

products AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_products"
)

SELECT
    p.product_name,
    p.category,
    EXTRACT(HOUR FROM o.created_at) AS order_hour,
    EXTRACT(MONTH FROM o.created_at) AS order_month,
    COUNT(o.order_id) AS total_orders,
    SUM(o.quantity) AS total_units_sold,
    SUM(o.total_amount) AS total_revenue
FROM orders o
INNER JOIN products p ON o.product_id = p.product_id
GROUP BY p.product_name, p.category, order_hour, order_month
ORDER BY order_month, order_hour, total_revenue DESC
  );
  