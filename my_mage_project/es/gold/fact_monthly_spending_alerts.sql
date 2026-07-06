DROP TABLE IF EXISTS expendsave_gold.fact_monthly_spending_alerts CASCADE;

CREATE TABLE expendsave_gold.fact_monthly_spending_alerts AS
SELECT 
    t.user_id,
    u.username,
    TO_CHAR(t.transaction_date, 'YYYY-MM') AS billing_month,
    t.category,
    SUM(t.amount) AS category_monthly_spend,
    u.monthly_salary,
    -- Percentage of salary spent on this category
    ROUND((SUM(t.amount) / u.monthly_salary) * 100, 2) AS percentage_of_salary,
    -- Alert flags for budgeting
    CASE 
        WHEN SUM(t.amount) > (u.monthly_salary * 0.30) THEN '🚨 OVERSPENDING LIMIT (30%+)'
        WHEN SUM(t.amount) > (u.monthly_salary * 0.15) THEN '⚠️ WARNING (15%-30%)'
        ELSE '🟢 SAFE (<15%)'
    END AS budget_status
FROM expendsave_silver.stg_transactions t
JOIN expendsave_silver.stg_users u ON t.user_id = u.user_id
WHERE t.transaction_type = 'expense'
GROUP BY t.user_id, u.username, TO_CHAR(t.transaction_date, 'YYYY-MM'), t.category, u.monthly_salary;

ALTER TABLE expendsave_gold.fact_monthly_spending_alerts ADD PRIMARY KEY (user_id, billing_month, category);
