-- InReal Database Setup Script
-- SQL Server 2019+
-- Creates the database and core tables for users and properties

-- 1. Create the database
CREATE DATABASE InReal_Demo;
GO

USE InReal_Demo;
GO

-- 2. Create Users table
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    CountryCode NVARCHAR(5),
    AccreditationStatus NVARCHAR(50) DEFAULT 'Unverified', -- Unverified, Verified, Professional
    KYCStatus NVARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
    IdentityVerified BIT DEFAULT 0,
    BankAccountLinked BIT DEFAULT 0,
    TotalInvested DECIMAL(18,2) DEFAULT 0,
    PortfolioValue DECIMAL(18,2) DEFAULT 0,
    TotalDistributions DECIMAL(18,2) DEFAULT 0,
    PreferredMarkets NVARCHAR(255), -- Bangkok, Dubai, Singapore (comma-separated)
    InvestmentStyle NVARCHAR(50), -- Conservative, Balanced, Aggressive
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    LastLoginAt DATETIME,
    IsActive BIT DEFAULT 1,
    IsDeleted BIT DEFAULT 0
);

-- 3. Create Properties table
CREATE TABLE Properties (
    PropertyID INT PRIMARY KEY IDENTITY(1,1),
    PropertyName NVARCHAR(255) NOT NULL,
    Address NVARCHAR(500),
    City NVARCHAR(100) NOT NULL, -- Bangkok, Dubai, Singapore
    Country NVARCHAR(100) NOT NULL,
    PropertyType NVARCHAR(50), -- Residential, Commercial
    Bedrooms INT,
    Bathrooms DECIMAL(3,1),
    SquareMeter DECIMAL(10,2),
    PropertyValue DECIMAL(18,2) NOT NULL, -- Total property value
    TotalFractions INT DEFAULT 1000, -- Number of fractional shares
    FractionPrice DECIMAL(18,2), -- Price per fraction
    AcquisitionPrice DECIMAL(18,2),
    AcquisitionDate DATE,
    MonthlyRentalIncome DECIMAL(18,2),
    ProjectedAnnualYield DECIMAL(5,2), -- As percentage (e.g., 7.8)
    ActualAnnualYield DECIMAL(5,2),
    CurrentOccupancyRate DECIMAL(5,2), -- As percentage
    TenantName NVARCHAR(255),
    LeaseExpiryDate DATE,
    PropertyDescription NVARCHAR(MAX),
    ImageURL NVARCHAR(500),
    Status NVARCHAR(50) DEFAULT 'Available', -- Available, PartiallySubscribed, FullySubscribed, Closed
    FractionsAvailable INT,
    FractionsSold INT DEFAULT 0,
    ManagerName NVARCHAR(255),
    InsuranceProvider NVARCHAR(255),
    InsurancePolicyNumber NVARCHAR(100),
    MaintenanceReserve DECIMAL(18,2) DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    IsDeleted BIT DEFAULT 0
);

-- 4. Create Investments table (to link users to properties)
CREATE TABLE Investments (
    InvestmentID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    PropertyID INT NOT NULL FOREIGN KEY REFERENCES Properties(PropertyID),
    FractionsOwned INT NOT NULL, -- Number of fractions owned by user
    InvestmentAmount DECIMAL(18,2) NOT NULL, -- Total $ invested
    DistributionEarned DECIMAL(18,2) DEFAULT 0, -- Total distributions received
    PricePerFraction DECIMAL(18,2), -- Price they paid per fraction
    InvestmentDate DATE NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Active', -- Active, Sold, Withdrawn
    SoldDate DATE,
    SoldPrice DECIMAL(18,2),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    IsDeleted BIT DEFAULT 0
);

-- 5. Create Distributions table (track monthly payouts)
CREATE TABLE Distributions (
    DistributionID INT PRIMARY KEY IDENTITY(1,1),
    PropertyID INT NOT NULL FOREIGN KEY REFERENCES Properties(PropertyID),
    DistributionMonth DATE NOT NULL, -- YYYY-MM-01 format
    TotalMonthlyRental DECIMAL(18,2), -- Total rental for the month
    MaintenanceCost DECIMAL(18,2) DEFAULT 0,
    TaxesPaid DECIMAL(18,2) DEFAULT 0,
    ManagementFeeAmount DECIMAL(18,2), -- 1.5% of rental
    NetDistributable DECIMAL(18,2), -- Amount available to investors
    DistributionDate DATE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- 6. Create InvestorDistributions table (per-investor payout tracking)
CREATE TABLE InvestorDistributions (
    InvestorDistributionID INT PRIMARY KEY IDENTITY(1,1),
    InvestmentID INT NOT NULL FOREIGN KEY REFERENCES Investments(InvestmentID),
    DistributionID INT NOT NULL FOREIGN KEY REFERENCES Distributions(DistributionID),
    AmountReceived DECIMAL(18,2), -- User's share of distribution
    DistributionDate DATE,
    Status NVARCHAR(50) DEFAULT 'Pending', -- Pending, Completed, Failed
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 7. Create Transactions table (audit trail)
CREATE TABLE Transactions (
    TransactionID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    TransactionType NVARCHAR(50), -- Investment, Distribution, Withdrawal, Transfer
    Amount DECIMAL(18,2),
    Currency NVARCHAR(5) DEFAULT 'USD',
    RelatedPropertyID INT FOREIGN KEY REFERENCES Properties(PropertyID),
    RelatedInvestmentID INT FOREIGN KEY REFERENCES Investments(InvestmentID),
    Description NVARCHAR(500),
    Status NVARCHAR(50) DEFAULT 'Pending', -- Pending, Completed, Failed
    TransactionDate DATETIME DEFAULT GETDATE(),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 8. Create indexes for performance
CREATE INDEX idx_users_email ON Users(Email);
CREATE INDEX idx_users_country ON Users(CountryCode);
CREATE INDEX idx_properties_city ON Properties(City);
CREATE INDEX idx_properties_status ON Properties(Status);
CREATE INDEX idx_investments_user ON Investments(UserID);
CREATE INDEX idx_investments_property ON Investments(PropertyID);
CREATE INDEX idx_distributions_property ON Distributions(PropertyID);
CREATE INDEX idx_investor_distributions_investment ON InvestorDistributions(InvestmentID);
CREATE INDEX idx_transactions_user ON Transactions(UserID);
GO

-- 9. Create views for quick insights
CREATE VIEW UserPortfolioSummary AS
SELECT 
    u.UserID,
    u.Email,
    u.FirstName,
    u.LastName,
    COUNT(DISTINCT i.PropertyID) AS PropertiesOwned,
    SUM(i.InvestmentAmount) AS TotalInvested,
    SUM(i.DistributionEarned) AS TotalDistributionsEarned,
    u.PortfolioValue
FROM Users u
LEFT JOIN Investments i ON u.UserID = i.UserID AND i.Status = 'Active' AND i.IsDeleted = 0
WHERE u.IsDeleted = 0 AND u.IsActive = 1
GROUP BY u.UserID, u.Email, u.FirstName, u.LastName, u.PortfolioValue;
GO

CREATE VIEW PropertyPerformance AS
SELECT 
    p.PropertyID,
    p.PropertyName,
    p.City,
    p.PropertyValue,
    p.ProjectedAnnualYield,
    p.ActualAnnualYield,
    COUNT(DISTINCT i.UserID) AS InvestorCount,
    SUM(i.FractionsOwned) AS TotalFractionsOwned,
    SUM(i.InvestmentAmount) AS TotalInvested,
    p.Status
FROM Properties p
LEFT JOIN Investments i ON p.PropertyID = i.PropertyID AND i.Status = 'Active' AND i.IsDeleted = 0
WHERE p.IsDeleted = 0 AND p.IsActive = 1
GROUP BY p.PropertyID, p.PropertyName, p.City, p.PropertyValue, p.ProjectedAnnualYield, p.ActualAnnualYield, p.Status;
GO

PRINT 'InReal database created successfully!';
PRINT 'Tables created: Users, Properties, Investments, Distributions, InvestorDistributions, Transactions';
PRINT 'Views created: UserPortfolioSummary, PropertyPerformance';
