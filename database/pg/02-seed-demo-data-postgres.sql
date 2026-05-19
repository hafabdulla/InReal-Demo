-- InReal PostgreSQL demo seed data

INSERT INTO users (
  email, first_name, last_name, phone_number, country_code,
  accreditation_status, kyc_status, identity_verified, bank_account_linked,
  total_invested, portfolio_value, total_distributions,
  preferred_markets, investment_style, is_active, is_deleted
) VALUES
('sarah.chen@email.com', 'Sarah', 'Chen', '+65 91234567', 'SG', 'Verified', 'Approved', TRUE, TRUE, 45000, 48250, 2250, 'Bangkok,Dubai', 'Balanced', TRUE, FALSE),
('james.smith@email.com', 'James', 'Smith', '+66 812345678', 'TH', 'Verified', 'Approved', TRUE, TRUE, 30000, 31800, 1200, 'Bangkok', 'Conservative', TRUE, FALSE),
('michael.johnson@email.com', 'Michael', 'Johnson', '+39 3331234567', 'IT', 'Verified', 'Approved', TRUE, TRUE, 62000, 66750, 3450, 'Italy,Bangkok', 'Aggressive', TRUE, FALSE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO properties (
  property_name, address, city, country, property_type, bedrooms, bathrooms,
  square_meter, property_value, total_fractions, fraction_price,
  acquisition_price, acquisition_date, monthly_rental_income,
  projected_annual_yield, actual_annual_yield, current_occupancy_rate,
  property_description, image_url, status, fractions_available, fractions_sold,
  manager_name, maintenance_reserve, is_active, is_deleted
) VALUES
('Bangkok Riverside Suites', '123 Riverside Road', 'Bangkok', 'Thailand', 'Residential', 2, 2, 82.5, 1250000, 1000, 1250, 1180000, '2024-08-12', 7800, 8.2, 7.9, 96.0, 'Premium serviced suites near central Bangkok.', 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200', 'PartiallySubscribed', 320, 680, 'InReal Thailand Ops', 20000, TRUE, FALSE),
('Milan Porta Nuova Loft', '45 Via Nuova', 'Milan', 'Italy', 'Residential', 1, 1, 64.0, 890000, 1000, 890, 835000, '2024-05-01', 5200, 7.1, 6.8, 94.0, 'Modern loft in Porta Nuova district.', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200', 'Available', 1000, 0, 'InReal Italy Ops', 12000, TRUE, FALSE),
('Dubai Marina Premium Unit', '8 Marina Walk', 'Dubai', 'UAE', 'Residential', 2, 2, 98.0, 2100000, 1200, 1750, 1980000, '2024-10-20', 13200, 9.0, 8.5, 92.0, 'High-demand apartment with marina views.', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200', 'PartiallySubscribed', 470, 730, 'InReal MENA Ops', 35000, TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- Basic investments
INSERT INTO investments (
  user_id, property_id, fractions_owned, investment_amount, distribution_earned,
  price_per_fraction, investment_date, status, is_deleted
)
SELECT u.user_id, p.property_id, 120, 150000, 6200, 1250, '2025-01-10', 'Active', FALSE
FROM users u, properties p
WHERE u.email = 'sarah.chen@email.com' AND p.property_name = 'Bangkok Riverside Suites'
ON CONFLICT DO NOTHING;

INSERT INTO investments (
  user_id, property_id, fractions_owned, investment_amount, distribution_earned,
  price_per_fraction, investment_date, status, is_deleted
)
SELECT u.user_id, p.property_id, 80, 100000, 3900, 1250, '2025-02-14', 'Active', FALSE
FROM users u, properties p
WHERE u.email = 'james.smith@email.com' AND p.property_name = 'Bangkok Riverside Suites'
ON CONFLICT DO NOTHING;

-- Distribution records
INSERT INTO distributions (
  property_id, distribution_month, total_monthly_rental, maintenance_cost,
  taxes_paid, management_fee_amount, net_distributable, distribution_date
)
SELECT p.property_id, '2026-03-01', 7800, 800, 500, 117, 6383, '2026-03-28'
FROM properties p
WHERE p.property_name = 'Bangkok Riverside Suites'
ON CONFLICT DO NOTHING;

-- Investor distributions
INSERT INTO investor_distributions (
  investment_id, distribution_id, amount_received, distribution_date, status
)
SELECT i.investment_id, d.distribution_id,
       CASE WHEN i.fractions_owned = 120 THEN 765.96 ELSE 510.64 END,
       '2026-03-28',
       'Completed'
FROM investments i
JOIN properties p ON p.property_id = i.property_id
JOIN distributions d ON d.property_id = p.property_id
WHERE p.property_name = 'Bangkok Riverside Suites'
  AND i.status = 'Active'
ON CONFLICT DO NOTHING;
