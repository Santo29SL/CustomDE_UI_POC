
  
    

  create  table "slinventoryDB"."silver"."stg_products__dbt_tmp"
  
  
    as
  
  (
    WITH raw_products AS (
    SELECT * FROM "slinventoryDB"."bronze"."products"
)

SELECT
    _id AS product_id,
    productName AS product_name,
    description,
    category,
    price,
    quantity,
    reorderLevel AS reorder_level,
    warehouseLocation AS warehouse_location,
    CASE 
        WHEN createdAt IS NOT NULL AND createdAt != '' AND createdAt != 'nan' THEN CAST(createdAt AS TIMESTAMP)
        ELSE NULL
    END AS created_at,
    CASE 
        WHEN updatedAt IS NOT NULL AND updatedAt != '' AND updatedAt != 'nan' THEN CAST(updatedAt AS TIMESTAMP)
        ELSE NULL
    END AS updated_at
FROM raw_products
  );
  