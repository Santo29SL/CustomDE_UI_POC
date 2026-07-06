-- Silver Layer: Cleanses and structures raw investment schemes collection data
CREATE SCHEMA IF NOT EXISTS expendsave_silver;

DROP TABLE IF EXISTS expendsave_silver.stg_investment_schemes CASCADE;

CREATE TABLE expendsave_silver.stg_investment_schemes AS
SELECT DISTINCT ON (_id)
    _id::VARCHAR(24) AS scheme_id,
    TRIM(name) AS scheme_name,
    LOWER(TRIM(category)) AS category,
    LOWER(TRIM(type)) AS scheme_type,
    COALESCE(avgreturnrate::DECIMAL(5,2), 0.00) AS avg_return_rate_percentage,
    LOWER(TRIM(risklevel)) AS risk_level, -- 'low', 'medium', 'high'
    COALESCE(lockinperiodmonths::INT, 0) AS lock_in_months
FROM expendsave_bronze.investmentschemes
ORDER BY _id;

ALTER TABLE expendsave_silver.stg_investment_schemes ADD PRIMARY KEY (scheme_id);
