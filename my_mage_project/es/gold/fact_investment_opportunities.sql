DROP TABLE IF EXISTS es_gold.fact_investment_opportunities CASCADE;

CREATE TABLE es_gold.fact_investment_opportunities AS
SELECT 
    p.user_id,
    p.username,
    p.savings_rate_percentage,
    p.current_calculated_balance AS surplus_funds,
    s.scheme_id,
    s.scheme_name,
    s.category AS scheme_category,
    s.avg_return_rate_percentage,
    s.risk_level,
    s.lock_in_months,
    -- recommendation scoring based on profile matching
    CASE 
        WHEN p.savings_rate_percentage >= 30.00 AND s.risk_level = 'high' THEN 'Highly Recommended (High Yield Growth)'
        WHEN p.savings_rate_percentage >= 15.00 AND s.risk_level = 'medium' THEN 'Recommended (Balanced Risk)'
        WHEN s.risk_level = 'low' THEN 'Recommended (capital Preservation)'
        ELSE 'Neutral Allocation'
    END AS recommendation_tier
FROM es_gold.fact_user_financial_profile p
CROSS JOIN es_silver.stg_investment_schemes s
WHERE p.current_calculated_balance > 0; -- Only match if they have money left

ALTER TABLE es_gold.fact_investment_opportunities ADD PRIMARY KEY (user_id, scheme_id);
