
  
    

  create  table "slinventoryDB"."silver"."stg_restocks__dbt_tmp"
  
  
    as
  
  (
    WITH raw_restocks AS (
    SELECT * FROM "slinventoryDB"."bronze"."restocks"
)

SELECT
    _id AS restock_id,
    productId AS product_id,
    currentStock AS current_stock,
    requestedQuantity AS requested_quantity,
    status,
    CASE 
        WHEN createdAt IS NOT NULL AND createdAt != '' AND createdAt != 'nan' THEN CAST(createdAt AS TIMESTAMP)
        ELSE NULL
    END AS created_at,
    CASE 
        WHEN updatedAt IS NOT NULL AND updatedAt != '' AND updatedAt != 'nan' THEN CAST(updatedAt AS TIMESTAMP)
        ELSE NULL
    END AS updated_at
FROM raw_restocks
  );
  