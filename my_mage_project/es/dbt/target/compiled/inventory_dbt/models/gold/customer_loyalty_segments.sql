WITH customer_spending AS (
    SELECT
        customer_id,
        SUM(total_amount) AS total_spend
    FROM "slinventoryDB"."silver"."stg_orders"
    WHERE customer_id IS NOT NULL AND status != 'cancelled'
    GROUP BY customer_id
),

classified_spending AS (
    SELECT
        customer_id,
        total_spend,
        CASE
            WHEN total_spend > 5000 THEN 'VIP Spender (>5k)'
            WHEN total_spend BETWEEN 1500 AND 5000 THEN 'Loyal Spender (1.5k-5k)'
            WHEN total_spend BETWEEN 500 AND 1500 THEN 'Regular Spender (500-1.5k)'
            ELSE 'Value/New Spender (<500)'
        END AS spending_segment
    FROM customer_spending
),

segment_aggregates AS (
    SELECT
        spending_segment,
        COUNT(customer_id) AS customer_count,
        SUM(total_spend) AS total_revenue_contributed
    FROM classified_spending
    GROUP BY spending_segment
),

grand_totals AS (
    SELECT SUM(total_revenue_contributed) AS grand_total_revenue FROM segment_aggregates
)

SELECT
    s.spending_segment,
    s.customer_count,
    s.total_revenue_contributed,
    ROUND((s.total_revenue_contributed * 100.0 / NULLIF(g.grand_total_revenue, 0)), 2) AS percentage_of_total_revenue
FROM segment_aggregates s
CROSS JOIN grand_totals g
ORDER BY s.total_revenue_contributed DESC