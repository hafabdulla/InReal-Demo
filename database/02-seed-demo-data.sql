-- InReal Demo Data Script
-- Inserts sample users and properties for demo/testing purposes

USE InReal_Demo;
GO

-- Insert sample users
INSERT INTO Users (Email, FirstName, LastName, PhoneNumber, CountryCode, AccreditationStatus, KYCStatus, IdentityVerified, BankAccountLinked, PreferredMarkets, InvestmentStyle, IsActive)
VALUES 
    ('sarah.chen@email.com', 'Sarah', 'Chen', '+65-98765432', 'SG', 'Verified', 'Approved', 1, 1, 'Bangkok, Dubai, Singapore', 'Balanced', 1),
    ('james.smith@email.com', 'James', 'Smith', '+971-501234567', 'AE', 'Verified', 'Approved', 1, 1, 'Dubai, Singapore', 'Conservative', 1),
    ('priya.kumar@email.com', 'Priya', 'Kumar', '+66-810123456', 'TH', 'Unverified', 'Pending', 0, 0, 'Bangkok', 'Aggressive', 1),
    ('michael.johnson@email.com', 'Michael', 'Johnson', '+1-2125551234', 'US', 'Professional', 'Approved', 1, 1, 'Singapore, Dubai', 'Balanced', 1),
    ('aisha.mohammed@email.com', 'Aisha', 'Mohammed', '+971-501111111', 'AE', 'Verified', 'Approved', 1, 1, 'Dubai, Bangkok', 'Conservative', 1),
    ('david.lee@email.com', 'David', 'Lee', '+60-189876543', 'MY', 'Verified', 'Approved', 1, 1, 'Bangkok, Singapore', 'Aggressive', 1);

GO

-- Insert sample properties
INSERT INTO Properties (
    PropertyName, Address, City, Country, PropertyType, Bedrooms, Bathrooms, SquareMeter,
    PropertyValue, TotalFractions, FractionPrice, AcquisitionPrice, AcquisitionDate,
    MonthlyRentalIncome, ProjectedAnnualYield, CurrentOccupancyRate, TenantName, LeaseExpiryDate,
    PropertyDescription, Status, FractionsAvailable, ManagerName, InsuranceProvider
)
VALUES 
    (
        'Bangkok Marina Residence - 2BR Unit 2805',
        '123 Sukhumvit Road, Pratunam',
        'Bangkok',
        'Thailand',
        'Residential',
        2,
        1.5,
        92.5,
        125000,
        250,
        500,
        120000,
        '2023-06-15',
        1020,
        7.8,
        100,
        'Tech Startup Co., Ltd',
        '2026-12-31',
        'Modern 2-bedroom apartment in prime Bangkok location. Waterfront views, gym, pool, 24/7 security. Fully furnished. High-income tenant.',
        'Available',
        245,
        'Bangkok Property Management LLC',
        'AXA Insurance'
    ),
    (
        'Dubai Marina Premium Apartment',
        '456 Marina Promenade, Dubai Marina',
        'Dubai',
        'UAE',
        'Residential',
        3,
        2,
        165,
        250000,
        500,
        500,
        240000,
        '2024-01-10',
        1625,
        7.8,
        100,
        'Gulf Investment Group',
        '2027-06-30',
        'Luxury 3-bedroom apartment with sea views. Marina-facing. Premium amenities, concierge service. Institutional-grade tenant.',
        'Available',
        480,
        'Emaar Property Management',
        'Emirates NBD Insurance'
    ),
    (
        'Singapore CBD Commercial Space',
        '789 Raffles Place, Downtown Core',
        'Singapore',
        'Singapore',
        'Commercial',
        NULL,
        NULL,
        250,
        400000,
        800,
        500,
        390000,
        '2023-09-20',
        2300,
        6.9,
        98,
        'Global Finance Corp',
        '2028-03-31',
        'Modern commercial office space in Singapore CBD. Grade A building. 99-year leasehold. Long-term institutional tenant.',
        'Available',
        750,
        'JLL Singapore',
        'AIA Singapore'
    ),
    (
        'Bangkok Sathorn Business District',
        '321 Sathorn Road, Bangrak',
        'Bangkok',
        'Thailand',
        'Residential',
        2,
        2,
        110,
        140000,
        280,
        500,
        135000,
        '2024-03-01',
        990,
        8.5,
        100,
        'Regional Trading House',
        '2026-08-31',
        'Premium 2-bedroom in Sathorn. Business district location. High walkability. Expat-friendly building.',
        'PartiallySubscribed',
        150,
        'Colliers Thailand',
        'Allianz Insurance'
    ),
    (
        'Dubai Downtown Apartment',
        '654 Downtown Boulevard, Downtown Dubai',
        'Dubai',
        'UAE',
        'Residential',
        2,
        1.5,
        95,
        180000,
        360,
        500,
        175000,
        '2024-02-15',
        1170,
        7.8,
        100,
        'International Trading LLC',
        '2027-02-28',
        'Modern 2-bedroom near Burj Khalifa. Downtown Dubai. Shopping mall proximity. Premium security.',
        'PartiallySubscribed',
        280,
        'CBRE Dubai',
        'Zurich Insurance'
    ),
    (
        'Singapore Orchard Residences',
        '987 Orchard Road, Orchard Planning Area',
        'Singapore',
        'Singapore',
        'Residential',
        3,
        2.5,
        155,
        320000,
        640,
        500,
        310000,
        '2023-11-05',
        1920,
        7.2,
        96,
        'Multinational Tech Company',
        '2028-05-31',
        'Luxe 3-bedroom in Orchard. Premium location. High-end furnishings. Expat community. Excellent schools nearby.',
        'Available',
        600,
        'Knight Frank Singapore',
        'NTUC Income'
    );

GO

-- Insert sample investments
DECLARE @SarahUserID INT = (SELECT TOP 1 UserID FROM Users WHERE Email = 'sarah.chen@email.com');
DECLARE @JamesUserID INT = (SELECT TOP 1 UserID FROM Users WHERE Email = 'james.smith@email.com');
DECLARE @PriyaUserID INT = (SELECT TOP 1 UserID FROM Users WHERE Email = 'priya.kumar@email.com');
DECLARE @MichaelUserID INT = (SELECT TOP 1 UserID FROM Users WHERE Email = 'michael.johnson@email.com');
DECLARE @BangkokPropertyID INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Bangkok Marina Residence%');
DECLARE @DubaiPropertyID INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Dubai Marina%');
DECLARE @SingaporePropertyID INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Singapore CBD%');

INSERT INTO Investments (UserID, PropertyID, FractionsOwned, InvestmentAmount, DistributionEarned, PricePerFraction, InvestmentDate, Status)
VALUES 
    (@SarahUserID, @BangkokPropertyID, 3, 1500, 47.50, 500, '2024-06-01', 'Active'),
    (@SarahUserID, @DubaiPropertyID, 2, 1000, 31.25, 500, '2024-07-15', 'Active'),
    (@JamesUserID, @DubaiPropertyID, 4, 2000, 62.50, 500, '2024-05-20', 'Active'),
    (@JamesUserID, @SingaporePropertyID, 5, 2500, 72.25, 500, '2024-08-01', 'Active'),
    (@PriyaUserID, @BangkokPropertyID, 1, 500, 15.75, 500, '2024-09-10', 'Active'),
    (@MichaelUserID, @SingaporePropertyID, 8, 4000, 115.60, 500, '2024-04-01', 'Active'),
    (@MichaelUserID, @DubaiPropertyID, 6, 3000, 93.75, 500, '2024-06-15', 'Active');

GO

-- Update user portfolio values based on investments
UPDATE Users
SET TotalInvested = (
    SELECT COALESCE(SUM(InvestmentAmount), 0)
    FROM Investments
    WHERE UserID = Users.UserID AND Status = 'Active' AND IsDeleted = 0
),
TotalDistributions = (
    SELECT COALESCE(SUM(DistributionEarned), 0)
    FROM Investments
    WHERE UserID = Users.UserID AND Status = 'Active' AND IsDeleted = 0
),
PortfolioValue = (
    SELECT COALESCE(SUM(InvestmentAmount), 0)
    FROM Investments
    WHERE UserID = Users.UserID AND Status = 'Active' AND IsDeleted = 0
)
WHERE IsDeleted = 0;

GO

-- Insert sample distributions
DECLARE @BangkokProperty INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Bangkok Marina Residence%');
DECLARE @DubaiProperty INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Dubai Marina%');
DECLARE @SingaporeProperty INT = (SELECT TOP 1 PropertyID FROM Properties WHERE PropertyName LIKE 'Singapore CBD%');

INSERT INTO Distributions (PropertyID, DistributionMonth, TotalMonthlyRental, MaintenanceCost, TaxesPaid, ManagementFeeAmount, NetDistributable, DistributionDate)
VALUES 
    (@BangkokProperty, '2024-09-01', 1020, 50, 150, 15.30, 804.70, '2024-10-05'),
    (@BangkokProperty, '2024-10-01', 1020, 40, 150, 15.30, 814.70, '2024-11-05'),
    (@DubaiProperty, '2024-09-01', 1625, 75, 240, 24.38, 1285.62, '2024-10-10'),
    (@DubaiProperty, '2024-10-01', 1625, 60, 240, 24.38, 1300.62, '2024-11-10'),
    (@SingaporeProperty, '2024-09-01', 2300, 100, 350, 34.50, 1815.50, '2024-10-15'),
    (@SingaporeProperty, '2024-10-01', 2300, 90, 350, 34.50, 1825.50, '2024-11-15');

GO

PRINT 'Demo data inserted successfully!';
PRINT 'Sample users: 6';
PRINT 'Sample properties: 6';
PRINT 'Sample investments: 7';
PRINT 'Sample distributions: 6';
PRINT '';
PRINT 'Quick test queries:';
PRINT 'SELECT * FROM UserPortfolioSummary;';
PRINT 'SELECT * FROM PropertyPerformance;';
