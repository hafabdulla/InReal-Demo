# InReal Database Setup Guide

## Overview
This directory contains SQL scripts to set up a local SQL Server database for the InReal portal demo. The schema includes tables for users, properties, investments, and distributions.

---

## Quick Start (3 Steps)

### Step 1: Open SQL Server Management Studio (SSMS)
1. Launch SSMS
2. Connect to your SQL Server instance
   - **Server name:** `localhost\SQLEXPRESS` (or your instance name)
   - **Authentication:** Windows Authentication (or SQL Authentication)

### Step 2: Run the Schema Script
1. In SSMS, open: `01-create-schema.sql`
2. Execute the script (F5 or Execute button)
3. You should see: `InReal database created successfully!`

### Step 3: Run the Demo Data Script
1. Open: `02-seed-demo-data.sql`
2. Execute the script
3. You should see sample users and properties loaded

**Done!** Your database is ready for the demo.

---

## Database Structure

### Users Table
Stores investor information and KYC status.

```sql
-- Key columns:
UserID (PK)           -- Unique identifier
Email                 -- User's email (unique)
FirstName, LastName   -- Investor name
PhoneNumber           -- Contact number
CountryCode           -- Country code (SG, AE, TH, etc.)
AccreditationStatus   -- Unverified, Verified, Professional
KYCStatus             -- Pending, Approved, Rejected
IdentityVerified      -- Boolean flag
BankAccountLinked     -- Boolean flag
TotalInvested         -- Cumulative investment amount
PortfolioValue        -- Current portfolio value
PreferredMarkets      -- Bangkok, Dubai, Singapore (preferences)
InvestmentStyle       -- Conservative, Balanced, Aggressive
CreatedAt, UpdatedAt  -- Timestamps
```

### Properties Table
Stores information about individual real estate properties.

```sql
-- Key columns:
PropertyID (PK)       -- Unique identifier
PropertyName          -- Property name
Address               -- Full address
City                  -- Bangkok, Dubai, Singapore
Country               -- Country name
PropertyType          -- Residential, Commercial
Bedrooms, Bathrooms   -- Unit details
SquareMeter           -- Size
PropertyValue         -- Total property value
TotalFractions        -- Number of fractional shares (typically 1000)
FractionPrice         -- Price per fraction (e.g., $500)
MonthlyRentalIncome   -- Monthly rent collected
ProjectedAnnualYield  -- Expected yield percentage (e.g., 7.8%)
ActualAnnualYield     -- Realized yield
CurrentOccupancyRate  -- Percentage occupied
TenantName            -- Current tenant
LeaseExpiryDate       -- When lease ends
Status                -- Available, PartiallySubscribed, FullySubscribed, Closed
FractionsSold         -- How many fractions sold
ManagerName           -- Property manager
```

### Investments Table
Links users to properties (junction table).

```sql
-- Key columns:
InvestmentID (PK)     -- Unique identifier
UserID (FK)           -- User making the investment
PropertyID (FK)       -- Property being invested in
FractionsOwned        -- Number of fractions owned by user
InvestmentAmount      -- Total $ invested
DistributionEarned    -- Total $ received so far
PricePerFraction      -- What they paid per fraction
InvestmentDate        -- When they invested
Status                -- Active, Sold, Withdrawn
```

### Distributions Table
Monthly rental distributions per property.

```sql
-- Key columns:
DistributionID (PK)   -- Unique identifier
PropertyID (FK)       -- Which property
DistributionMonth     -- YYYY-MM-01 format
TotalMonthlyRental    -- Gross rental income
ManagementFeeAmount   -- 1.5% fee
NetDistributable      -- Amount to pay investors
DistributionDate      -- When it was paid
```

### InvestorDistributions Table
Per-investor payout tracking (each investor gets a share).

```sql
-- Key columns:
InvestorDistributionID (PK) -- Unique identifier
InvestmentID (FK)           -- Which investment
DistributionID (FK)         -- Which distribution
AmountReceived              -- User's share of that distribution
Status                      -- Pending, Completed, Failed
```

### Transactions Table
Audit trail of all investor activity.

```sql
-- Key columns:
TransactionID (PK)    -- Unique identifier
UserID (FK)           -- Which user
TransactionType       -- Investment, Distribution, Withdrawal, Transfer
Amount                -- $ amount
RelatedPropertyID     -- Which property (if relevant)
Status                -- Pending, Completed, Failed
TransactionDate       -- When it happened
```

---

## Demo Data Included

### Sample Users (6)
- **Sarah Chen** (singapore): Investor with 2 active properties ($2,500 invested)
- **James Smith** (UAE): Professional investor with 2 properties ($4,500 invested)
- **Priya Kumar** (Thailand): New investor, just started ($500 invested)
- **Michael Johnson** (USA): Large investor, 2 properties ($6,500 invested)
- **Aisha Mohammed** (UAE): Conservative investor ($0 invested initially)
- **David Lee** (Malaysia): Aggressive investor ($0 invested initially)

### Sample Properties (6)
1. **Bangkok Marina Residence** - $125K, 7.8% yield, 2BR
2. **Dubai Marina Premium** - $250K, 7.8% yield, 3BR
3. **Singapore CBD Commercial** - $400K, 6.9% yield, office space
4. **Bangkok Sathorn** - $140K, 8.5% yield, 2BR
5. **Dubai Downtown** - $180K, 7.8% yield, 2BR
6. **Singapore Orchard** - $320K, 7.2% yield, 3BR

### Sample Investments (7)
Various users have invested in properties. Check distributions for monthly payout data.

---

## Quick SQL Queries for Testing

```sql
USE InReal_Demo;

-- View user portfolio summary
SELECT * FROM UserPortfolioSummary;

-- View property performance
SELECT * FROM PropertyPerformance;

-- Get a specific investor's portfolio
SELECT 
    u.FirstName,
    u.Email,
    p.PropertyName,
    p.City,
    i.FractionsOwned,
    i.InvestmentAmount,
    i.DistributionEarned
FROM Users u
JOIN Investments i ON u.UserID = i.UserID
JOIN Properties p ON i.PropertyID = p.PropertyID
WHERE u.Email = 'sarah.chen@email.com';

-- Get all distributions for a property
SELECT * FROM Distributions WHERE PropertyID = 1 ORDER BY DistributionMonth DESC;

-- Get investor distribution details
SELECT 
    id.AmountReceived,
    id.DistributionDate,
    d.TotalMonthlyRental,
    p.PropertyName
FROM InvestorDistributions id
JOIN Distributions d ON id.DistributionID = d.DistributionID
JOIN Properties p ON d.PropertyID = p.PropertyID
ORDER BY id.DistributionDate DESC;

-- Check user investment details
SELECT 
    u.FirstName,
    u.TotalInvested,
    u.TotalDistributions,
    u.PortfolioValue,
    COUNT(i.PropertyID) AS PropertiesOwned
FROM Users u
LEFT JOIN Investments i ON u.UserID = i.UserID AND i.Status = 'Active'
GROUP BY u.UserID, u.FirstName, u.TotalInvested, u.TotalDistributions, u.PortfolioValue;

-- List all active investments
SELECT 
    p.PropertyName,
    p.City,
    i.FractionsOwned,
    i.InvestmentAmount,
    i.InvestmentDate
FROM Investments i
JOIN Properties p ON i.PropertyID = p.PropertyID
WHERE i.Status = 'Active'
ORDER BY i.InvestmentDate DESC;
```

---

## Connecting from Node.js / React Backend

### Installation
```bash
npm install mssql
```

### Usage Example
```javascript
const { connectToDatabase, query } = require('./database/db-config');

// Connect once
await connectToDatabase();

// Get all properties
const properties = await query('SELECT * FROM Properties WHERE IsActive = 1');
console.log(properties);

// Get user portfolio
const portfolio = await query(
  'SELECT * FROM UserPortfolioSummary WHERE UserID = @userId',
  { userId: 1 }
);

// Close connection when done
// await closeConnection();
```

### Environment Variables (.env)
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=InReal_Demo
DB_USER=sa
DB_PASSWORD=YourPassword123
```

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to server"
**Solution:**
1. Verify SQL Server is running: Start → SQL Server Configuration Manager
2. Check server name: In SSMS, it's shown at top of screen
3. For default instance: `localhost` or `.(dot)`
4. For named instance: `localhost\SQLEXPRESS` or `localhost\MSSQL15.SQLEXPRESS`

### Issue: "Login failed for user 'sa'"
**Solution:**
1. SQL Server may use Windows Authentication by default
2. In SSMS, connect with: **Windows Authentication** (not SQL Authentication)
3. Or enable SQL Server authentication: Properties → Security → SQL and Windows

### Issue: "Database already exists"
**Solution:**
1. Run: `DROP DATABASE InReal_Demo;` (careful!)
2. Then re-run the schema script

### Issue: "Error in script 02-seed-demo-data.sql"
**Solution:**
1. Make sure you ran `01-create-schema.sql` first
2. Check the output message for specific errors

---

## Backup & Restore

### Backup the database
```sql
BACKUP DATABASE InReal_Demo 
TO DISK = 'C:\Backups\InReal_Demo.bak';
```

### Restore the database
```sql
RESTORE DATABASE InReal_Demo 
FROM DISK = 'C:\Backups\InReal_Demo.bak';
```

---

## Next Steps: Migration to Supabase

Once you're ready to move to Supabase for production:

1. **Export data from SQL Server:**
   - Right-click database → Tasks → Generate Scripts
   - Select all tables, views, data

2. **Create Supabase project:**
   - Go to supabase.com
   - Create new project
   - Use PostgreSQL schema (Supabase uses PostgreSQL, not SQL Server)

3. **Migrate schema:**
   - Convert SQL Server schema to PostgreSQL syntax
   - Key differences: `IDENTITY` → `SERIAL`, `NVARCHAR` → `VARCHAR`, `BIT` → `BOOLEAN`

4. **Update connection string:**
   - Replace `db-config.js` with Supabase connection
   - Use `@supabase/supabase-js` library

---

## Questions?
For more info on SQL Server: https://docs.microsoft.com/sql/
For Supabase migration: https://supabase.com/docs/guides/migrations
