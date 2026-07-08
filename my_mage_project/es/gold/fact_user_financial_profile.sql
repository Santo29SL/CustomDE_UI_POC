CREATE SCHEMA IF NOT EXISTS es_gold;

DROP TABLE IF EXISTS es_gold.fact_user_financial_profile CASCADE;

CREATE TABLE es_gold.fact_user_financial_profile AS
WITH user_agg AS (
    SELECT 
        user_id,
        -- Total Income
        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0.00 END), 0.00) AS total_income,
        -- Total Expenses
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0.00 END), 0.00) AS total_expense,
        -- Transaction counts
        COUNT(transaction_id) AS total_transactions_count
    FROM es_silver.stg_transactions
    GROUP BY user_id
)
SELECT 
    u.user_id,
    u.username,
    u.monthly_salary,
    u.target_savings AS financial_target_savings,
    ua.total_income,
    ua.total_expense,
    -- Net balance remaining
    (u.monthly_salary + ua.total_income - ua.total_expense) AS current_calculated_balance,
    -- Lifetime Savings Rate
    CASE 
        WHEN (u.monthly_salary + ua.total_income) = 0 THEN 0.00
        ELSE ROUND(((u.monthly_salary + ua.total_income - ua.total_expense) / (u.monthly_salary + ua.total_income)) * 100, 2)
    END AS savings_rate_percentage,
    ua.total_transactions_count
FROM es_silver.stg_users u
LEFT JOIN user_agg ua ON u.user_id = ua.user_id;

ALTER TABLE es_gold.fact_user_financial_profile ADD PRIMARY KEY (user_id);
