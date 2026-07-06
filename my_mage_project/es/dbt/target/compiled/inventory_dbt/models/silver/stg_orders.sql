WITH raw_orders AS (
    SELECT * FROM "slinventoryDB"."bronze"."orders"
)

SELECT
    _id AS order_id,
    -- Coalesce customer and product ID fields from different schema versions
    COALESCE(
        NULLIF(NULLIF(customerId, ''), 'nan'),
        NULLIF(NULLIF(customer, ''), 'nan')
    ) AS customer_id,
    COALESCE(
        NULLIF(NULLIF(productId, ''), 'nan'),
        NULLIF(NULLIF(product, ''), 'nan')
    ) AS product_id,
    quantity,
    -- Coalesce pricing/amount fields
    COALESCE(totalAmount, totalPrice) AS total_amount,
    status,
    NULLIF(NULLIF(deliverypartner, ''), 'nan') AS delivery_partner_id,
    CASE 
        WHEN createdAt IS NOT NULL AND createdAt != '' AND createdAt != 'nan' THEN CAST(createdAt AS TIMESTAMP)
        ELSE NULL
    END AS created_at,
    CASE 
        WHEN updatedAt IS NOT NULL AND updatedAt != '' AND updatedAt != 'nan' THEN CAST(updatedAt AS TIMESTAMP)
        ELSE NULL
    END AS updated_at
FROM raw_orders