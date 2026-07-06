
  
    

  create  table "slinventoryDB"."silver"."stg_users__dbt_tmp"
  
  
    as
  
  (
    WITH raw_users AS (
    SELECT * FROM "slinventoryDB"."bronze"."users"
)

SELECT
    _id AS user_id,
    name,
    email,
    role,
    -- Convert string timestamps to actual timestamp types
    CASE 
        WHEN createdAt IS NOT NULL AND createdAt != '' AND createdAt != 'nan' THEN CAST(createdAt AS TIMESTAMP)
        ELSE NULL
    END AS created_at,
    CASE 
        WHEN updatedAt IS NOT NULL AND updatedAt != '' AND updatedAt != 'nan' THEN CAST(updatedAt AS TIMESTAMP)
        ELSE NULL
    END AS updated_at
FROM raw_users
  );
  