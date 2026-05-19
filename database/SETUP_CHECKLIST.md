## InReal SQL Server Database - Setup Checklist

### Prerequisites ✓
- [ ] SQL Server installed (any edition: Express, Developer, Standard)
- [ ] SQL Server Management Studio (SSMS) installed
- [ ] SQL Server Agent service running (optional but recommended)
- [ ] Windows user has Admin/dbcreator role (usually default local install)

---

## Setup Steps

### Step 1: Verify SQL Server Connection
**Estimated time: 2 minutes**

1. [ ] Open SQL Server Management Studio (SSMS)
2. [ ] Connect to your SQL Server instance:
   - **Server name:** `localhost\SQLEXPRESS` (for default Express)
   - **Or:** `.\SQLEXPRESS` (dot notation)
   - **Or:** Just `localhost` (if default instance)
   - **Authentication:** Windows Authentication (or SQL Authentication)
3. [ ] Click **Connect**
4. [ ] You should see the database tree on the left

**If connection fails:**
- [ ] Verify SQL Server service is running (Start → Services)
- [ ] Check instance name: Right-click server in Object Explorer → Properties → General tab shows "Server name"

---

### Step 2: Create Database Schema
**Estimated time: 5 minutes**

1. [ ] In SSMS, click **File → Open → File**
2. [ ] Navigate to: `database\01-create-schema.sql`
3. [ ] Open the file
4. [ ] Click the **Execute** button (F5 shortcut)
5. [ ] Wait for completion (~2-3 seconds)
6. [ ] You should see green checkmark: `InReal database created successfully!`

**If script fails:**
- [ ] Check error message at bottom
- [ ] Common: "CREATE DATABASE permission denied" → Run SSMS as Admin
- [ ] Try running line-by-line to identify problem line

**Verify:**
- [ ] In **Object Explorer** (left panel), expand **Databases**
- [ ] You should see **InReal_Demo** database listed
- [ ] Expand **InReal_Demo → Tables**
- [ ] You should see 7 tables: Users, Properties, Investments, Distributions, InvestorDistributions, Transactions, + system tables

---

### Step 3: Load Demo Data
**Estimated time: 5 minutes**

1. [ ] Open `database\02-seed-demo-data.sql`
2. [ ] Execute (F5)
3. [ ] You should see: `Demo data inserted successfully!`
   - Sample users: 6
   - Sample properties: 6
   - Sample investments: 7
   - Sample distributions: 6

**Verify:**
- [ ] Run this quick query in SSMS:
  ```sql
  USE InReal_Demo;
  SELECT COUNT(*) as UserCount FROM Users;
  SELECT COUNT(*) as PropertyCount FROM Properties;
  SELECT COUNT(*) as InvestmentCount FROM Investments WHERE Status = 'Active';
  ```
- [ ] Expected: 6 users, 6 properties, 7 active investments

---

### Step 4: Create Stored Procedures (Optional but Recommended)
**Estimated time: 3 minutes**

1. [ ] Open `database\03-stored-procedures.sql`
2. [ ] Execute (F5)
3. [ ] You should see: `Stored procedures created successfully!`

**Verify:**
- [ ] In Object Explorer, expand **InReal_Demo → Programmability → Stored Procedures**
- [ ] You should see 10 procedures listed (all start with `sp_`)

---

### Step 5: Run Quick Reference Queries (Test Everything)
**Estimated time: 5 minutes**

1. [ ] Open `database\04-quick-reference-queries.sql`
2. [ ] Execute sections one at a time or all at once (F5)
3. [ ] You should see results for all test queries

**Expected results:**
- [ ] PART 1 - Table count: 7 tables
- [ ] PART 2 - Data verification: 6 users, 6 properties, 7 investments
- [ ] PART 3 - Data queries: See sample users, properties, investments
- [ ] PART 4 - Views: UserPortfolioSummary and PropertyPerformance populated
- [ ] PART 5 - Stored procedures: All procedures return data
- [ ] PART 6 - Complex queries: ROI analysis, property status, etc.

---

### Step 6: (Optional) Install Node.js Package for Backend Connection
**Estimated time: 3 minutes**

If you want to connect from a Node.js backend (Express, Nest, etc.):

1. [ ] Open terminal in your project root
2. [ ] Run: `npm install mssql`
3. [ ] Copy `database/db-config.js` to your backend folder
4. [ ] Create `.env` file with:
   ```
   DB_SERVER=localhost\SQLEXPRESS
   DB_NAME=InReal_Demo
   DB_USER=sa
   DB_PASSWORD=YourPassword123
   ```
5. [ ] Use in your code:
   ```javascript
   const { connectToDatabase, query } = require('./database/db-config');
   
   // Get all properties
   const properties = await query('SELECT * FROM Properties WHERE IsActive = 1');
   ```

---

### Step 7: Test with React Frontend (Optional)
**Estimated time: 10 minutes**

If integrating with your React app:

1. [ ] Create backend API endpoint that connects to database
2. [ ] Example endpoint `/api/properties`:
   ```javascript
   app.get('/api/properties', async (req, res) => {
     const properties = await query('EXEC sp_GetActiveProperties');
     res.json(properties);
   });
   ```
3. [ ] Test endpoint: Open browser → `http://localhost:3000/api/properties`
4. [ ] Should return JSON array of properties

---

## Quick Reference Commands

### Most Useful Queries (Copy-Paste These)

```sql
USE InReal_Demo;

-- Get all users
SELECT * FROM Users WHERE IsDeleted = 0;

-- Get all properties
SELECT * FROM Properties WHERE IsActive = 1;

-- Get user portfolio summary
SELECT * FROM UserPortfolioSummary;

-- Get property performance
SELECT * FROM PropertyPerformance;

-- Get a user's investments
SELECT * FROM Investments WHERE UserID = 1 AND Status = 'Active';

-- Get recent distributions
SELECT * FROM Distributions ORDER BY DistributionMonth DESC;

-- Dashboard stats
EXEC sp_GetDashboardStats;

-- Get top investors
EXEC sp_GetTopInvestors @TopN = 10;

-- Get property metrics
EXEC sp_GetPropertyMetrics @PropertyID = 1;
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to server" | Verify SQL Server is running: Services → SQL Server (SQLEXPRESS) |
| "CREATE DATABASE permission denied" | Run SSMS as Administrator |
| "Database already exists" | Run `DROP DATABASE InReal_Demo;` then re-run script 1 |
| "Cannot find database" | Refresh Object Explorer: F5 key or right-click → Refresh |
| "Procedure not found" | Make sure you ran script 3 (03-stored-procedures.sql) |
| Demo data won't load | Verify schema script (script 1) ran successfully first |
| Node.js connection fails | Check connection string in db-config.js matches your SQL Server instance |

---

## File Structure

```
database/
├── README.md                        ← Setup guide & migration info
├── 01-create-schema.sql             ← Run FIRST (creates tables)
├── 02-seed-demo-data.sql            ← Run SECOND (adds demo data)
├── 03-stored-procedures.sql         ← Run THIRD (creates procedures)
├── 04-quick-reference-queries.sql   ← Run to TEST everything
├── db-config.js                     ← Copy to backend folder
└── SETUP_CHECKLIST.md               ← This file
```

---

## Success Checklist

- [ ] Database `InReal_Demo` exists in SSMS
- [ ] All 7 tables created
- [ ] Demo data loaded (can see users, properties, investments)
- [ ] Stored procedures created
- [ ] Quick reference queries return data
- [ ] Can query data from SSMS directly
- [ ] (Optional) Node.js connection working

---

## What's Next?

### For Demo/Stakeholder Presentation:
1. ✓ Database is ready with realistic demo data
2. [ ] Build UI components to display properties
3. [ ] Build investor portfolio dashboard
4. [ ] Connect API endpoints to database
5. [ ] Show sample investor journeys (signup → invest → earn distributions)

### For Production Migration to Supabase:
1. [ ] Export data from SQL Server
2. [ ] Convert schema to PostgreSQL syntax (see README.md)
3. [ ] Create Supabase project
4. [ ] Migrate data to Supabase
5. [ ] Update connection strings in code
6. [ ] Test thoroughly before go-live

---

## Need Help?

**Check existing queries in:**
- `README.md` — Full documentation
- `04-quick-reference-queries.sql` — Example queries
- Stored procedure definitions in `03-stored-procedures.sql`

**Common questions:**
- "How do I add a new property?" → Use SSMS Insert or create a procedure
- "How do I modify an investment?" → Update statement in SQL
- "How do I migrate to Supabase?" → See README.md Migration section
- "How do I connect from React?" → Use `db-config.js` + API endpoints

---

## Status

**Database Setup:** ✓ Complete
**Demo Data:** ✓ Loaded
**Ready for Demo:** ✓ Yes
**Ready for Production:** ⏳ After Supabase migration

---

**Created:** May 5, 2026
**Last Updated:** May 5, 2026
**Status:** Ready for Stakeholder Demo
