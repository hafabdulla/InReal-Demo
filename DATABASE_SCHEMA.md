# InReal Database Schema Documentation

## Database: `InReal_Demo`

### Overview
The InReal platform database stores user investment data, properties, distributions, and transaction history for a fractional real estate investment application.

---

## Tables

### 1. **Users** Table
Stores user account information and investment profile data.

**In Business Terms (What Information We Keep About Each Investor):**
- User ID (unique identifier)
- Email Address
- role ()
- First Name
- Last Name
- Phone Number 
- WhatsApp (Optional)
- Preferred method of communication (Email/WhatsApp/Phone)
- Country (Nationality)
- Country (Residence)
- Annual Income
- Source of Funds
- Investor Status (Verified/Unverified/Professional) 
- ID Verification Status (Pending/Approved/Rejected)
- ID Verified (Yes/No)
- Bank Account Connected (Yes/No)
- Total Amount Invested (lifetime)
- Current Portfolio Value
- Total Earnings Received from Distributions
- Preferred Investment Cities (e.g., Bangkok, Dubai, Singapore)
- Investment Style (Conservative/Balanced/Aggressive)
- Account Created Date
- Account Active (Yes/No)

- BANK Details (IBAN, Beneficiary Name, Country, )

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| UserID | INT | PK, Identity(1,1) | Unique user identifier |
| Email | NVARCHAR(255) | UNIQUE, NOT NULL | User email address |
| FirstName | NVARCHAR(100) | | User first name |
| LastName | NVARCHAR(100) | | User last name |
| PhoneNumber | NVARCHAR(20) | | User phone number |
| CountryCode | NVARCHAR(5) | | ISO country code (e.g., 'SG', 'AE', 'TH') |
| AccreditationStatus | NVARCHAR(50) | DEFAULT 'Unverified' | Unverified, Verified, Professional |
| KYCStatus | NVARCHAR(50) | DEFAULT 'Pending' | Pending, Approved, Rejected |
| IdentityVerified | BIT | DEFAULT 0 | Identity verification flag (for demo: 1 = verified) |
| BankAccountLinked | BIT | DEFAULT 0 | Bank account linking status |
| TotalInvested | DECIMAL(18,2) | DEFAULT 0 | Total amount invested across all properties |
| PortfolioValue | DECIMAL(18,2) | DEFAULT 0 | Current portfolio value |
| TotalDistributions | DECIMAL(18,2) | DEFAULT 0 | Total distributions received |
| PreferredMarkets | NVARCHAR(255) | | Comma-separated preferred cities |
| InvestmentStyle | NVARCHAR(50) | | Conservative, Balanced, Aggressive |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Account creation timestamp |
| UpdatedAt | DATETIME | DEFAULT GETDATE() | Last update timestamp |
| LastLoginAt | DATETIME | | Last login timestamp |
| IsActive | BIT | DEFAULT 1 | Account active flag |
| IsDeleted | BIT | DEFAULT 0 | Soft delete flag |

**Indexes:** `idx_users_email`, `idx_users_country`

**Demo Users:** 3 demo accounts with IdentityVerified=1
- sarah.chen@email.com
- james.smith@email.com
- michael.johnson@email.com

---

### 2. **Properties** Table
Stores details about real estate investment properties.

**In Business Terms (What Information We Keep About Each Property):**
- Property ID (unique identifier)
- Property Name/Title
- Address
- City
- Country
- Property Type (Residential/Commercial)
- Number of Bedrooms
- Number of Bathrooms
- Property Size (square meters)
- Total Property Value
- Total Shares Available (divided into fractions)
- Price per Share
- Original Purchase Price
- Purchase Date
- Expected Monthly Rental Income
- Projected Annual Return %
- Actual Annual Return %
- Current Occupancy Rate %
- Current Tenant Name
- Lease Expiry Date
- Property Description
- Property Image
- Property Status (Available/Partially Sold/Fully Sold/Closed)
- Shares Still Available
- Shares Sold
- Property Manager Name
- Insurance Company
- Insurance Policy Number
- Maintenance Fund Reserve
- Property Active (Yes/No)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| PropertyID | INT | PK, Identity(1,1) | Unique property identifier |
| PropertyName | NVARCHAR(255) | NOT NULL | Property name |
| Address | NVARCHAR(500) | | Full address |
| City | NVARCHAR(100) | NOT NULL | City name (Bangkok, Dubai, Singapore) |
| Country | NVARCHAR(100) | NOT NULL | Country name |
| PropertyType | NVARCHAR(50) | | Residential, Commercial |
| Bedrooms | INT | | Number of bedrooms |
| Bathrooms | DECIMAL(3,1) | | Number of bathrooms |
| SquareMeter | DECIMAL(10,2) | | Property size in square meters |
| PropertyValue | DECIMAL(18,2) | NOT NULL | Total property value |
| TotalFractions | INT | DEFAULT 1000 | Total number of fractional shares |
| FractionPrice | DECIMAL(18,2) | | Price per fraction |
| AcquisitionPrice | DECIMAL(18,2) | | Original purchase price |
| AcquisitionDate | DATE | | Date property was acquired |
| MonthlyRentalIncome | DECIMAL(18,2) | | Expected monthly rental income |
| ProjectedAnnualYield | DECIMAL(5,2) | | Projected annual return % (e.g., 7.8) |
| ActualAnnualYield | DECIMAL(5,2) | | Actual annual return % |
| CurrentOccupancyRate | DECIMAL(5,2) | | Current occupancy rate % |
| TenantName | NVARCHAR(255) | | Current tenant name |
| LeaseExpiryDate | DATE | | Lease end date |
| PropertyDescription | NVARCHAR(MAX) | | Detailed property description |
| ImageURL | NVARCHAR(500) | | URL to property image |
| Status | NVARCHAR(50) | DEFAULT 'Available' | Available, PartiallySubscribed, FullySubscribed, Closed |
| FractionsAvailable | INT | | Number of fractions still available |
| FractionsSold | INT | DEFAULT 0 | Number of fractions sold |
| ManagerName | NVARCHAR(255) | | Property manager name |
| InsuranceProvider | NVARCHAR(255) | | Insurance company name |
| InsurancePolicyNumber | NVARCHAR(100) | | Insurance policy number |
| MaintenanceReserve | DECIMAL(18,2) | DEFAULT 0 | Maintenance fund reserve |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Record creation timestamp |
| UpdatedAt | DATETIME | DEFAULT GETDATE() | Last update timestamp |
| IsActive | BIT | DEFAULT 1 | Property active flag |
| IsDeleted | BIT | DEFAULT 0 | Soft delete flag |

**Indexes:** `idx_properties_city`, `idx_properties_status`

**Demo Properties:** 6 properties seeded with data

---

### 3. **Investments** Table
Links users to properties and tracks their investment amounts.

**In Business Terms (Each Investor's Purchase of Property Shares):**
- Investment ID (unique transaction identifier)
- Investor/User ID
- Property ID
- Number of Shares Owned
- Amount Invested ($)
- Total Earnings Received So Far
- Price per Share (what they paid)
- Investment Date
- Investment Status (Active/Sold/Withdrawn)
- Date Sold (if applicable)
- Sale Price (if applicable)

(exited/internal transaction)
(investment id/transaction id)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| InvestmentID | INT | PK, Identity(1,1) | Unique investment record ID |
| UserID | INT | FK → Users(UserID) | Investor user ID |
| PropertyID | INT | FK → Properties(PropertyID) | Investment property ID |
| FractionsOwned | INT | NOT NULL | Number of fractions owned |
| InvestmentAmount | DECIMAL(18,2) | NOT NULL | Total amount invested in USD |
| DistributionEarned | DECIMAL(18,2) | DEFAULT 0 | Total distributions received |
| PricePerFraction | DECIMAL(18,2) | | Price paid per fraction |
| InvestmentDate | DATE | NOT NULL | Date of investment |
| Status | NVARCHAR(50) | DEFAULT 'Active' | Active, Sold, Withdrawn |
| SoldDate | DATE | | Date investment was sold |
| SoldPrice | DECIMAL(18,2) | | Sale price if sold |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Record creation timestamp |
| UpdatedAt | DATETIME | DEFAULT GETDATE() | Last update timestamp |
| IsDeleted | BIT | DEFAULT 0 | Soft delete flag |

**Indexes:** `idx_investments_user`, `idx_investments_property`

**Demo Data:** 7 demo investments across demo users

---

### 4. **Distributions** Table
Tracks monthly rental income distributions per property.

**In Business Terms (Monthly Payouts From Each Property):**
- Distribution ID (unique payout record)
- Property ID
- Month (which month's earnings)
- Total Rental Income Collected
- Maintenance Costs This Month
- Taxes Paid This Month
- Management Fee (1.5% of rental)
- Net Amount to Be Paid to Investors (after all deductions)
- Payout Date

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| DistributionID | INT | PK, Identity(1,1) | Unique distribution record ID |
| PropertyID | INT | FK → Properties(PropertyID) | Property generating distribution |
| DistributionMonth | DATE | NOT NULL | Month of distribution (YYYY-MM-01 format) |
| TotalMonthlyRental | DECIMAL(18,2) | | Total rental income for month |
| MaintenanceCost | DECIMAL(18,2) | DEFAULT 0 | Monthly maintenance costs |
| TaxesPaid | DECIMAL(18,2) | DEFAULT 0 | Taxes paid |
| ManagementFeeAmount | DECIMAL(18,2) | | Management fee (1.5% of rental) |
| NetDistributable | DECIMAL(18,2) | | Net amount available to investors |
| DistributionDate | DATE | | Date distribution was paid |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Record creation timestamp |
| UpdatedAt | DATETIME | DEFAULT GETDATE() | Last update timestamp |

**Indexes:** `idx_distributions_property`

---

### 5. **InvestorDistributions** Table
Tracks individual investor payouts from distributions.

**In Business Terms (What Each Investor Gets From Monthly Payouts):**
- Payout ID (unique record)
- Investment ID (which investor's property share)
- Distribution ID (which monthly payout)
- Amount Paid to This Investor ($)
- Payout Date
- Payout Status (Pending/Completed/Failed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| InvestorDistributionID | INT | PK, Identity(1,1) | Unique investor distribution ID |
| InvestmentID | INT | FK → Investments(InvestmentID) | User's investment record |
| DistributionID | INT | FK → Distributions(DistributionID) | Distribution being paid |
| AmountReceived | DECIMAL(18,2) | | User's share of distribution |
| DistributionDate | DATE | | Payout date |
| Status | NVARCHAR(50) | DEFAULT 'Pending' | Pending, Completed, Failed |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Record creation timestamp |

**Indexes:** `idx_investor_distributions_investment`

---

### 6. **Transactions** Table
Audit trail of all financial transactions.

**In Business Terms (Record of All Money Movements):**
- Transaction ID (unique record)
- User/Investor ID
- Type of Transaction (Investment/Earning/Withdrawal/Transfer)
- Amount ($)
- Currency
- Related Property (if applicable)
- Related Investment (if applicable)
- Description
- Status (Pending/Completed/Failed)
- Transaction Date

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| TransactionID | INT | PK, Identity(1,1) | Unique transaction ID |
| UserID | INT | FK → Users(UserID) | User performing transaction |
| TransactionType | NVARCHAR(50) | | Investment, Distribution, Withdrawal, Transfer |
| Amount | DECIMAL(18,2) | | Transaction amount |
| Currency | NVARCHAR(5) | DEFAULT 'USD' | Currency code |
| RelatedPropertyID | INT | FK → Properties(PropertyID) | Related property (if applicable) |
| RelatedInvestmentID | INT | FK → Investments(InvestmentID) | Related investment (if applicable) |
| Description | NVARCHAR(500) | | Transaction description |
| Status | NVARCHAR(50) | DEFAULT 'Pending' | Pending, Completed, Failed |
| TransactionDate | DATETIME | DEFAULT GETDATE() | Transaction timestamp |
| CreatedAt | DATETIME | DEFAULT GETDATE() | Record creation timestamp |

**Indexes:** `idx_transactions_user`

---

## Key Database Features

### Authentication
- Email-based authentication (no password for demo)
- `IdentityVerified` flag for login eligibility (required = 1)
- Demo users: Pre-verified with IdentityVerified=1, AccreditationStatus='Verified', KYCStatus='Approved'

### Demo Data
- **3 Demo Users** with pre-loaded investments
- **6 Demo Properties** with funding opportunities
- **7 Demo Investments** across different users and properties
- **Mock Distributions** for testing portfolio views

### Foreign Key Relationships
```
Users (1) ─── (M) Investments
Properties (1) ─── (M) Investments
Investments (1) ─── (M) InvestorDistributions
Distributions (1) ─── (M) InvestorDistributions
Users (1) ─── (M) Transactions
Properties (1) ─── (M) Distributions
```

### Fractional Ownership Model
- Properties divided into fractions (typically 1000 per property)
- Users purchase fractional shares of properties
- Rental income distributed proportionally based on fractions owned

### Financial Tracking
- **Portfolio Value** = Sum of (FractionsOwned × FractionPrice)
- **Annual Yield** = (MonthlyRental × 12) / PropertyValue × 100%
- **Management Fee** = 1.5% of rental income
- **Net Distributable** = MonthlyRental - Maintenance - Taxes - ManagementFee

---

## Database Connection Details
- **Server:** localhost\SQLEXPRESS
- **Database Name:** InReal_Demo
- **User:** sa
- **Password:** Demo123!
- **Driver:** mssql (Node.js)

---

## API Endpoints (Based on DB Structure)

### User Portfolio
- `GET /api/user/:userId/portfolio` - User's portfolio summary + investments

### Distributions
- `GET /api/user/:userId/distributions` - User's distribution history

### Properties
- `GET /api/properties` - All properties (planned)
- `GET /api/properties/:id` - Single property details (planned)

---

## Notes
- All timestamps use SQL Server's `GETDATE()` function
- Soft delete pattern used (IsDeleted flag) instead of hard deletes
- Identity columns auto-increment starting from 1
- DECIMAL(18,2) used for all monetary values (high precision)
- Demo data is pre-seeded for testing without API uploads
