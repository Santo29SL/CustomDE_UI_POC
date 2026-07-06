
  
    

  create  table "slinventoryDB"."silver"."stg_stocklogs__dbt_tmp"
  
  
    as
  
  (
    WITH raw_stocklogs AS (
    SELECT * FROM "slinventoryDB"."bronze"."stocklogs"
)

SELECT
    _id AS log_id,
    productId AS product_id,
    userId AS user_id,
    action,
    quantity,
    reason,
    CASE 
        WHEN createdAt IS NOT NULL AND createdAt != '' AND createdAt != 'nan' THEN CAST(createdAt AS TIMESTAMP)
        ELSE NULL
    END AS created_at,
    CASE 
        WHEN updatedAt IS NOT NULL AND updatedAt != '' AND updatedAt != 'nan' THEN CAST(updatedAt AS TIMESTAMP)
        ELSE NULL
    END AS updated_at
FROM raw_stocklogs
  );
  