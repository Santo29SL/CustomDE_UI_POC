-- Silver Layer: Cleanses and structures raw users collection data
CREATE SCHEMA IF NOT EXISTS es_silver;

DROP TABLE IF EXISTS es_silver.stg_users CASCADE;

CREATE TABLE es_silver.stg_users AS
SELECT DISTINCT ON (_id)
    _id::VARCHAR(24) AS user_id,
    TRIM(username) AS username,
    password AS password_hash,
    COALESCE(monthlysalary::DECIMAL(12,2), 0.00) AS monthly_salary,
    COALESCE(targetsavings::DECIMAL(12,2), 0.00) AS target_savings,
    createdat::TIMESTAMP AS created_at,
    updatedat::TIMESTAMP AS updated_at
FROM es_bronze.users
ORDER BY _id, updatedat DESC;

ALTER TABLE es_silver.stg_users ADD PRIMARY KEY (user_id);
