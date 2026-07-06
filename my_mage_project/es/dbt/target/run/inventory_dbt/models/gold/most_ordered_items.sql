
  
    

  create  table "slinventoryDB"."gold"."most_ordered_items__dbt_tmp"
  
  
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
    SUM(o.quantity) AS total_quantity_sold,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total_amount) AS total_revenue
FROM orders o
INNER JOIN products p ON o.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY total_quantity_sold DESC
  );
  