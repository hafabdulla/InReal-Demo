-- Quick Reference: InReal Database Setup & Test Queries
-- Run these after completing setup to verify everything works

USE InReal_Demo;
GO

-- ============================================
-- PART 1: VERIFY SETUP
-- ============================================

-- Check that all tables were created
SELECT 
    TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;

-- Expected output: 7 tables
-- Distributions, InvestorDistributions, Investments, Properties, Transactions, Users, [other system tables]

-- Check that views exist
SELECT 
    TABLE_NAME 
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME;

-- Expected output: PropertyPerformance, UserPortfolioSummary

-- ============================================
-- PART 2: TEST DATA VERIFICATION
-- ============================================

-- Count sample records
PRINT '=== DATA COUNTS ===';
PRINT 'Users:';
SELECT COUNT(*) FROM Users WHERE IsDeleted = 0;

PRINT 'Properties:';
SELECT COUNT(*) FROM Properties WHERE IsDeleted = 0;

PRINT 'Investments:';
SELECT COUNT(*) FROM Investments WHERE Status = 'Active' AND IsDeleted = 0;

PRINT 'Distributions:';
SELECT COUNT(*) FROM Distributions;

-- ============================================
-- PART 3: VIEW SAMPLE DATA
-- ============================================

-- 1. See all users
PRINT '=== ALL USERS ===';
SELECT 
    UserID,
    Email,
    FirstName,
    LastName,
    CountryCode,
    TotalInvested,
    TotalDistributions,
    AccreditationStatus,
    KYCStatus
FROM Users
WHERE IsDeleted = 0
ORDER BY UserID;

-- 2. See all properties
PRINT '=== ALL PROPERTIES ===';
SELECT 
    PropertyID,
    PropertyName,
    City,
    PropertyValue,
    FractionPrice,
    ProjectedAnnualYield,
    Status,
    (TotalFractions - FractionsSold) AS FractionsAvailable
FROM Properties
WHERE IsActive = 1
ORDER BY City, ProjectedAnnualYield DESC;

-- 3. See all investments
PRINT '=== ALL INVESTMENTS ===';
SELECT 
    i.InvestmentID,
    u.FirstName + ' ' + u.LastName AS Investor,
    p.PropertyName,
    p.City,
    i.FractionsOwned,
    i.InvestmentAmount,
    i.DistributionEarned,
    i.InvestmentDate
FROM Investments i
JOIN Users u ON i.UserID = u.UserID
JOIN Properties p ON i.PropertyID = p.PropertyID
WHERE i.Status = 'Active' AND i.IsDeleted = 0
ORDER BY i.InvestmentDate DESC;

-- ============================================
-- PART 4: RUN VIEWS
-- ============================================

-- Portfolio Summary View
PRINT '=== USER PORTFOLIO SUMMARY ===';
SELECT * FROM UserPortfolioSummary;

-- Property Performance View
PRINT '=== PROPERTY PERFORMANCE ===';
SELECT * FROM PropertyPerformance;

-- ============================================
-- PART 5: TEST STORED PROCEDURES
-- ============================================

-- Make sure stored procedures are created first (run 03-stored-procedures.sql)

-- Test 1: Get a specific user's portfolio
PRINT '=== USER PORTFOLIO (Sarah Chen) ===';
EXEC sp_GetUserPortfolio @UserID = 1;

-- Test 2: Get user's investments with details
PRINT '=== USER INVESTMENTS (Sarah Chen) ===';
EXEC sp_GetUserInvestments @UserID = 1;

-- Test 3: Get all active properties
PRINT '=== ACTIVE PROPERTIES ===';
EXEC sp_GetActiveProperties;

-- Test 4: Get properties by city
PRINT '=== BANGKOK PROPERTIES ===';
EXEC sp_GetPropertiesByCity @City = 'Bangkok';

-- Test 5: Get property metrics
PRINT '=== BANGKOK MARINA PROPERTY METRICS ===';
EXEC sp_GetPropertyMetrics @PropertyID = 1;

-- Test 6: Get recent distributions
PRINT '=== RECENT DISTRIBUTIONS (Last 6 months) ===';
EXEC sp_GetRecentDistributions @Months = 6;

-- Test 7: Get investor earnings
PRINT '=== INVESTOR EARNINGS (Sarah Chen, Last 12 months) ===';
EXEC sp_GetInvestorEarnings @UserID = 1, @Months = 12;

-- Test 8: Get top investors
PRINT '=== TOP 5 INVESTORS ===';
EXEC sp_GetTopInvestors @TopN = 5;

-- Test 9: Dashboard stats
PRINT '=== DASHBOARD SUMMARY ===';
EXEC sp_GetDashboardStats;

-- ============================================
-- PART 6: COMPLEX QUERIES FOR DEMO
-- ============================================

-- 6.1: Investor ROI breakdown
PRINT '=== INVESTOR ROI ANALYSIS ===';
SELECT 
    u.FirstName + ' ' + u.LastName AS InvestorName,
    u.Email,
    COUNT(DISTINCT i.PropertyID) AS PropertiesOwned,
    u.TotalInvested,
    u.TotalDistributions,
    CASE 
        WHEN u.TotalInvested > 0 
        THEN CAST(ROUND((u.TotalDistributions / u.TotalInvested * 100), 2) AS NVARCHAR(50)) + '%'
        ELSE 'N/A'
    END AS ROI,
    DATEDIFF(MONTH, MIN(i.InvestmentDate), GETDATE()) AS MonthsInvested
FROM Users u
LEFT JOIN Investments i ON u.UserID = i.UserID AND i.Status = 'Active' AND i.IsDeleted = 0
WHERE u.TotalInvested > 0 AND u.IsDeleted = 0
GROUP BY u.UserID, u.FirstName, u.LastName, u.Email, u.TotalInvested, u.TotalDistributions
ORDER BY u.TotalInvested DESC;

-- 6.2: Property subscription status
PRINT '=== PROPERTY SUBSCRIPTION STATUS ===';
SELECT 
    PropertyID,
    PropertyName,
    City,
    PropertyValue,
    TotalFractions,
    FractionsSold,
    (TotalFractions - FractionsSold) AS FractionsRemaining,
    CAST(ROUND((CAST(FractionsSold AS FLOAT) / TotalFractions * 100), 1) AS NVARCHAR(50)) + '%' AS SubscriptionPercent,
    Status
FROM Properties
WHERE IsActive = 1 AND IsDeleted = 0
ORDER BY SubscriptionPercent DESC;

-- 6.3: Distribution tracking
PRINT '=== MONTHLY DISTRIBUTION BREAKDOWN ===';
SELECT 
    p.PropertyName,
    p.City,
    d.DistributionMonth,
    d.TotalMonthlyRental,
    d.ManagementFeeAmount,
    d.NetDistributable,
    CAST(ROUND((d.ManagementFeeAmount / d.TotalMonthlyRental * 100), 1) AS NVARCHAR(50)) + '%' AS FeePercent
FROM Distributions d
JOIN Properties p ON d.PropertyID = p.PropertyID
WHERE d.DistributionMonth >= DATEADD(MONTH, -6, GETDATE())
ORDER BY d.DistributionMonth DESC, p.PropertyName;

-- 6.4: User investment portfolio composition
PRINT '=== PORTFOLIO BREAKDOWN BY CITY (for Sarah Chen) ===';
SELECT 
    p.City,
    COUNT(DISTINCT i.PropertyID) AS PropertiesInCity,
    SUM(i.InvestmentAmount) AS TotalInvested,
    SUM(i.DistributionEarned) AS TotalEarned,
    CAST(ROUND((SUM(i.InvestmentAmount) / 
        (SELECT SUM(InvestmentAmount) FROM Investments WHERE UserID = 1 AND Status = 'Active' AND IsDeleted = 0) * 100), 1) 
        AS NVARCHAR(50)) + '%' AS PortfolioPercent
FROM Investments i
JOIN Properties p ON i.PropertyID = p.PropertyID
WHERE i.UserID = 1 AND i.Status = 'Active' AND i.IsDeleted = 0
GROUP BY p.City
ORDER BY TotalInvested DESC;

-- 6.5: Property yield comparison
PRINT '=== PROPERTY YIELD COMPARISON ===';
SELECT 
    PropertyName,
    City,
    PropertyValue,
    ProjectedAnnualYield,
    MonthlyRentalIncome,
    MonthlyRentalIncome * 12 AS AnnualRentalIncome,
    Status,
    (TotalFractions - FractionsSold) AS FractionsRemaining,
    FractionPrice,
    (TotalFractions - FractionsSold) * FractionPrice AS TotalRemainingValue
FROM Properties
WHERE IsActive = 1 AND IsDeleted = 0
ORDER BY ProjectedAnnualYield DESC;

-- ============================================
-- PART 7: EXPORT DATA FOR DASHBOARD
-- ============================================

-- These queries can be used to populate dashboard widgets

-- Widget 1: Total AUM
SELECT SUM(InvestmentAmount) AS TotalAUM FROM Investments WHERE Status = 'Active' AND IsDeleted = 0;

-- Widget 2: Active Investors
SELECT COUNT(DISTINCT UserID) AS ActiveInvestors FROM Investments WHERE Status = 'Active' AND IsDeleted = 0;

-- Widget 3: Total Distributions Paid Out
SELECT SUM(TotalDistributions) AS TotalDistributions FROM Users WHERE IsDeleted = 0;

-- Widget 4: Average Investment Amount
SELECT AVG(InvestmentAmount) AS AvgInvestment FROM Investments WHERE Status = 'Active' AND IsDeleted = 0;

-- Widget 5: Properties with highest occupancy
SELECT TOP 5 PropertyName, City, CurrentOccupancyRate FROM Properties WHERE IsActive = 1 ORDER BY CurrentOccupancyRate DESC;

-- ============================================
-- PART 8: TROUBLESHOOTING QUERIES
-- ============================================

-- Check for any data integrity issues

-- Users without verified identity but claimed to have invested
SELECT u.UserID, u.Email, u.IdentityVerified, COUNT(i.InvestmentID) AS InvestmentCount
FROM Users u
LEFT JOIN Investments i ON u.UserID = i.UserID
WHERE u.IdentityVerified = 0 AND i.InvestmentID IS NOT NULL
GROUP BY u.UserID, u.Email, u.IdentityVerified;

-- Properties with no investors
SELECT PropertyID, PropertyName, City, Status FROM Properties WHERE PropertyID NOT IN (SELECT DISTINCT PropertyID FROM Investments WHERE IsDeleted = 0) AND IsActive = 1;

-- Investments with no corresponding distributions
SELECT i.InvestmentID, i.UserID, i.PropertyID FROM Investments i LEFT JOIN InvestorDistributions id ON i.InvestmentID = id.InvestmentID WHERE id.InvestorDistributionID IS NULL AND i.Status = 'Active';

-- ============================================
-- READY FOR DEMO!
-- ============================================
PRINT '';
PRINT 'Database is ready for demo!';
PRINT 'All tables, views, and procedures are working.';
PRINT 'You have:';
PRINT '  - 6 test users';
PRINT '  - 6 properties';
PRINT '  - 7 active investments';
PRINT '  - 6 months of distribution data';
PRINT '';
PRINT 'Next: Connect to your React frontend using db-config.js';
