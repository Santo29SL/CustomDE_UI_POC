
  
    

  create  table "slinventoryDB"."gold"."delivery_partner_load__dbt_tmp"
  
  
    as
  
  (
    WITH delivery_users AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_users"
    WHERE role = 'delivery'
),

orders AS (
    SELECT * FROM "slinventoryDB"."silver"."stg_orders"
),

partner_metrics AS (
    SELECT
        delivery_partner_id,
        COUNT(order_id) AS total_assigned_shipments,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS active_shipments,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_shipments
    FROM orders
    WHERE delivery_partner_id IS NOT NULL
    GROUP BY delivery_partner_id
)

SELECT
    u.user_id AS delivery_partner_id,
    u.name AS delivery_partner_name,
    u.email AS delivery_partner_email,
    COALESCE(p.total_assigned_shipments, 0) AS total_assigned_shipments,
    COALESCE(p.active_shipments, 0) AS active_shipments,
    COALESCE(p.delivered_shipments, 0) AS delivered_shipments,
    CASE 
        WHEN COALESCE(p.total_assigned_shipments, 0) > 0 THEN 
            ROUND((COALESCE(p.active_shipments, 0) * 100.0 / p.total_assigned_shipments), 2)
        ELSE 0.00
    END AS active_load_percentage
FROM delivery_users u
LEFT JOIN partner_metrics p ON u.user_id = p.delivery_partner_id
ORDER BY total_assigned_shipments DESC
  );
  