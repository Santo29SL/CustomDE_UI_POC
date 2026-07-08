-- Silver Layer: Cleanses and structures raw transactions collection data
CREATE SCHEMA IF NOT EXISTS es_silver;

DROP TABLE IF EXISTS es_silver.stg_transactions CASCADE;

CREATE TABLE es_silver.stg_transactions AS
SELECT DISTINCT ON (_id)
    _id::VARCHAR(24) AS transaction_id,
    user::VARCHAR(24) AS user_id,
    TRIM(description) AS description,
    COALESCE(amount::DECIMAL(12,2), 0.00) AS amount,
    date::TIMESTAMP AS transaction_date,
    LOWER(TRIM(type)) AS transaction_type, -- 'expense', 'income'
    LOWER(TRIM(category)) AS category,     -- 'food', 'shopping', etc.
    createdat::TIMESTAMP AS created_at,
    updatedat::TIMESTAMP AS updated_at
FROM es_bronze.transactions
ORDER BY _id, updatedat DESC;

ALTER TABLE es_silver.stg_transactions ADD PRIMARY KEY (transaction_id);
