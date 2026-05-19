-- InReal PostgreSQL schema for hosted demo (Option 2)

CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(30),
  country_code VARCHAR(10),
  accreditation_status VARCHAR(50) DEFAULT 'Unverified',
  kyc_status VARCHAR(50) DEFAULT 'Pending',
  identity_verified BOOLEAN DEFAULT FALSE,
  bank_account_linked BOOLEAN DEFAULT FALSE,
  total_invested NUMERIC(18,2) DEFAULT 0,
  portfolio_value NUMERIC(18,2) DEFAULT 0,
  total_distributions NUMERIC(18,2) DEFAULT 0,
  preferred_markets VARCHAR(255),
  investment_style VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS properties (
  property_id BIGSERIAL PRIMARY KEY,
  property_name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  property_type VARCHAR(50),
  bedrooms INT,
  bathrooms NUMERIC(3,1),
  square_meter NUMERIC(10,2),
  property_value NUMERIC(18,2) NOT NULL,
  total_fractions INT DEFAULT 1000,
  fraction_price NUMERIC(18,2),
  acquisition_price NUMERIC(18,2),
  acquisition_date DATE,
  monthly_rental_income NUMERIC(18,2),
  projected_annual_yield NUMERIC(5,2),
  actual_annual_yield NUMERIC(5,2),
  current_occupancy_rate NUMERIC(5,2),
  tenant_name VARCHAR(255),
  lease_expiry_date DATE,
  property_description TEXT,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'Available',
  fractions_available INT,
  fractions_sold INT DEFAULT 0,
  manager_name VARCHAR(255),
  insurance_provider VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  maintenance_reserve NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS investments (
  investment_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  property_id BIGINT NOT NULL REFERENCES properties(property_id),
  fractions_owned INT NOT NULL,
  investment_amount NUMERIC(18,2) NOT NULL,
  distribution_earned NUMERIC(18,2) DEFAULT 0,
  price_per_fraction NUMERIC(18,2),
  investment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  sold_date DATE,
  sold_price NUMERIC(18,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS distributions (
  distribution_id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(property_id),
  distribution_month DATE NOT NULL,
  total_monthly_rental NUMERIC(18,2),
  maintenance_cost NUMERIC(18,2) DEFAULT 0,
  taxes_paid NUMERIC(18,2) DEFAULT 0,
  management_fee_amount NUMERIC(18,2),
  net_distributable NUMERIC(18,2),
  distribution_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investor_distributions (
  investor_distribution_id BIGSERIAL PRIMARY KEY,
  investment_id BIGINT NOT NULL REFERENCES investments(investment_id),
  distribution_id BIGINT NOT NULL REFERENCES distributions(distribution_id),
  amount_received NUMERIC(18,2),
  distribution_date DATE,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  transaction_type VARCHAR(50),
  amount NUMERIC(18,2),
  currency VARCHAR(5) DEFAULT 'USD',
  related_property_id BIGINT REFERENCES properties(property_id),
  related_investment_id BIGINT REFERENCES investments(investment_id),
  description JSONB,
  status VARCHAR(50) DEFAULT 'Pending',
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_property ON investments(property_id);
CREATE INDEX IF NOT EXISTS idx_distributions_property ON distributions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
