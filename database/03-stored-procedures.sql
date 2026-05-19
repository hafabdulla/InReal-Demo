-- InReal Stored Procedures
-- Common queries wrapped as procedures for ease of use

USE InReal_Demo;
GO

-- 1. Get user portfolio summary
CREATE PROCEDURE sp_GetUserPortfolio
    @UserID INT
AS
BEGIN
    SELECT 
        u.UserID,
        u.Email,
        u.FirstName,
        u.LastName,
        u.CountryCode,
        u.TotalInvested,
        u.TotalDistributions,
        u.PortfolioValue,
        COUNT(DISTINCT i.PropertyID) AS PropertiesOwned,
        u.InvestmentStyle,
        u.AccreditationStatus,
        u.KYCStatus
    FROM Users u
    LEFT JOIN Investments i ON u.UserID = i.UserID AND i.Status = 'Active' AND i.IsDeleted = 0
    WHERE u.UserID = @UserID
    GROUP BY 
        u.UserID, u.Email, u.FirstName, u.LastName, u.CountryCode,
        u.TotalInvested, u.TotalDistributions, u.PortfolioValue,
        u.InvestmentStyle, u.AccreditationStatus, u.KYCStatus;
END;

GO

-- 2. Get user's investments with property details
CREATE PROCEDURE sp_GetUserInvestments
    @UserID INT
AS
BEGIN
    SELECT 
        i.InvestmentID,
        p.PropertyID,
        p.PropertyName,
        p.City,
        p.Country,
        p.PropertyType,
        i.FractionsOwned,
        i.InvestmentAmount,
        i.PricePerFraction,
        i.InvestmentDate,
        i.DistributionEarned,
        p.MonthlyRentalIncome,
        p.ProjectedAnnualYield,
        p.Status,
        i.Status AS InvestmentStatus
    FROM Investments i
    JOIN Properties p ON i.PropertyID = p.PropertyID
    WHERE i.UserID = @UserID AND i.IsDeleted = 0
    ORDER BY i.InvestmentDate DESC;
END;

GO

-- 3. Get all active properties
CREATE PROCEDURE sp_GetActiveProperties
AS
BEGIN
    SELECT 
        p.PropertyID,
        p.PropertyName,
        p.City,
        p.Country,
        p.PropertyType,
        p.PropertyValue,
        p.FractionPrice,
        p.MonthlyRentalIncome,
        p.ProjectedAnnualYield,
        p.CurrentOccupancyRate,
        p.TenantName,
        p.Status,
        p.FractionsSold,
        p.TotalFractions,
        (p.TotalFractions - p.FractionsSold) AS FractionsAvailable,
        p.PropertyDescription
    FROM Properties
    WHERE IsActive = 1 AND IsDeleted = 0
    ORDER BY p.ProjectedAnnualYield DESC, p.City;
END;

GO

-- 4. Get properties by city
CREATE PROCEDURE sp_GetPropertiesByCity
    @City NVARCHAR(100)
AS
BEGIN
    SELECT 
        p.PropertyID,
        p.PropertyName,
        p.Address,
        p.PropertyType,
        p.Bedrooms,
        p.Bathrooms,
        p.PropertyValue,
        p.FractionPrice,
        p.ProjectedAnnualYield,
        p.CurrentOccupancyRate,
        p.Status,
        COUNT(DISTINCT i.UserID) AS InvestorCount,
        SUM(i.InvestmentAmount) AS TotalInvested
    FROM Properties p
    LEFT JOIN Investments i ON p.PropertyID = i.PropertyID AND i.Status = 'Active' AND i.IsDeleted = 0
    WHERE p.City = @City AND p.IsActive = 1 AND p.IsDeleted = 0
    GROUP BY 
        p.PropertyID, p.PropertyName, p.Address, p.PropertyType,
        p.Bedrooms, p.Bathrooms, p.PropertyValue, p.FractionPrice,
        p.ProjectedAnnualYield, p.CurrentOccupancyRate, p.Status
    ORDER BY p.ProjectedAnnualYield DESC;
END;

GO

-- 5. Get property performance metrics
CREATE PROCEDURE sp_GetPropertyMetrics
    @PropertyID INT
AS
BEGIN
    SELECT 
        p.PropertyID,
        p.PropertyName,
        p.City,
        p.PropertyValue,
        p.FractionPrice,
        p.ProjectedAnnualYield,
        p.ActualAnnualYield,
        p.MonthlyRentalIncome,
        p.CurrentOccupancyRate,
        p.Status,
        COUNT(DISTINCT i.UserID) AS InvestorCount,
        p.FractionsSold,
        p.TotalFractions,
        (p.TotalFractions - p.FractionsSold) AS FractionsRemaining,
        SUM(i.InvestmentAmount) AS TotalCapitalRaised,
        SUM(i.DistributionEarned) AS TotalDistributionsPaid,
        AVG(DATEDIFF(DAY, i.InvestmentDate, GETDATE())) AS AvgHoldingDays
    FROM Properties p
    LEFT JOIN Investments i ON p.PropertyID = i.PropertyID AND i.Status = 'Active' AND i.IsDeleted = 0
    WHERE p.PropertyID = @PropertyID
    GROUP BY 
        p.PropertyID, p.PropertyName, p.City, p.PropertyValue, p.FractionPrice,
        p.ProjectedAnnualYield, p.ActualAnnualYield, p.MonthlyRentalIncome,
        p.CurrentOccupancyRate, p.Status, p.FractionsSold, p.TotalFractions;
END;

GO

-- 6. Get recent distributions
CREATE PROCEDURE sp_GetRecentDistributions
    @Months INT = 6
AS
BEGIN
    SELECT TOP 100
        d.DistributionID,
        p.PropertyName,
        p.City,
        d.DistributionMonth,
        d.TotalMonthlyRental,
        d.ManagementFeeAmount,
        d.NetDistributable,
        d.DistributionDate,
        COUNT(DISTINCT id.InvestorDistributionID) AS InvestorsReceived
    FROM Distributions d
    JOIN Properties p ON d.PropertyID = p.PropertyID
    LEFT JOIN InvestorDistributions id ON d.DistributionID = id.DistributionID
    WHERE d.DistributionMonth >= DATEADD(MONTH, -@Months, GETDATE())
    GROUP BY 
        d.DistributionID, p.PropertyName, p.City, d.DistributionMonth,
        d.TotalMonthlyRental, d.ManagementFeeAmount, d.NetDistributable, d.DistributionDate
    ORDER BY d.DistributionMonth DESC;
END;

GO

-- 7. Get investor earnings breakdown
CREATE PROCEDURE sp_GetInvestorEarnings
    @UserID INT,
    @Months INT = 12
AS
BEGIN
    SELECT 
        p.PropertyName,
        p.City,
        SUM(id.AmountReceived) AS TotalEarnings,
        COUNT(DISTINCT id.DistributionID) AS DistributionCount,
        AVG(id.AmountReceived) AS AvgDistribution,
        MAX(id.DistributionDate) AS LastDistribution
    FROM InvestorDistributions id
    JOIN Distributions d ON id.DistributionID = d.DistributionID
    JOIN Investments i ON id.InvestmentID = i.InvestmentID
    JOIN Properties p ON i.PropertyID = p.PropertyID
    WHERE i.UserID = @UserID
        AND id.DistributionDate >= DATEADD(MONTH, -@Months, GETDATE())
        AND i.IsDeleted = 0
    GROUP BY p.PropertyName, p.City
    ORDER BY TotalEarnings DESC;
END;

GO

-- 8. Invest in a property (transaction procedure)
CREATE PROCEDURE sp_InvestInProperty
    @UserID INT,
    @PropertyID INT,
    @FractionsOwned INT,
    @InvestmentAmount DECIMAL(18,2)
AS
BEGIN
    BEGIN TRANSACTION
    BEGIN TRY
        -- Check if property exists and has availability
        DECLARE @PropertyValue DECIMAL(18,2);
        DECLARE @FractionPrice DECIMAL(18,2);
        DECLARE @FractionsAvailable INT;
        
        SELECT 
            @PropertyValue = PropertyValue,
            @FractionPrice = FractionPrice,
            @FractionsAvailable = TotalFractions - FractionsSold
        FROM Properties
        WHERE PropertyID = @PropertyID;
        
        IF @FractionsAvailable < @FractionsOwned
        BEGIN
            RAISERROR('Not enough fractions available', 16, 1);
        END
        
        -- Insert investment record
        INSERT INTO Investments (
            UserID, PropertyID, FractionsOwned, InvestmentAmount,
            PricePerFraction, InvestmentDate, Status
        )
        VALUES (
            @UserID, @PropertyID, @FractionsOwned, @InvestmentAmount,
            @FractionPrice, GETDATE(), 'Active'
        );
        
        -- Update property fractions sold
        UPDATE Properties
        SET FractionsSold = FractionsSold + @FractionsOwned,
            UpdatedAt = GETDATE()
        WHERE PropertyID = @PropertyID;
        
        -- Record transaction
        INSERT INTO Transactions (
            UserID, TransactionType, Amount, RelatedPropertyID, 
            RelatedInvestmentID, Description, Status, TransactionDate
        )
        SELECT 
            @UserID, 'Investment', @InvestmentAmount, @PropertyID,
            MAX(InvestmentID), 'Investment in ' + (SELECT PropertyName FROM Properties WHERE PropertyID = @PropertyID),
            'Completed', GETDATE()
        FROM Investments
        WHERE UserID = @UserID AND PropertyID = @PropertyID;
        
        -- Update user totals
        UPDATE Users
        SET TotalInvested = TotalInvested + @InvestmentAmount,
            PortfolioValue = PortfolioValue + @InvestmentAmount,
            UpdatedAt = GETDATE()
        WHERE UserID = @UserID;
        
        COMMIT TRANSACTION;
        SELECT 'Investment successful' AS Result;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH
END;

GO

-- 9. Get top investors
CREATE PROCEDURE sp_GetTopInvestors
    @TopN INT = 10
AS
BEGIN
    SELECT TOP (@TopN)
        u.UserID,
        u.Email,
        u.FirstName,
        u.LastName,
        u.CountryCode,
        u.TotalInvested,
        u.TotalDistributions,
        u.PortfolioValue,
        COUNT(DISTINCT i.PropertyID) AS PropertiesOwned,
        CAST((u.TotalDistributions / u.TotalInvested * 100) AS DECIMAL(5,2)) AS ROI_Percentage
    FROM Users u
    LEFT JOIN Investments i ON u.UserID = i.UserID AND i.Status = 'Active' AND i.IsDeleted = 0
    WHERE u.TotalInvested > 0 AND u.IsDeleted = 0
    GROUP BY 
        u.UserID, u.Email, u.FirstName, u.LastName, u.CountryCode,
        u.TotalInvested, u.TotalDistributions, u.PortfolioValue
    ORDER BY u.TotalInvested DESC;
END;

GO

-- 10. Dashboard summary stats
CREATE PROCEDURE sp_GetDashboardStats
AS
BEGIN
    SELECT 
        'Total Users' AS Metric,
        CAST(COUNT(*) AS NVARCHAR(50)) AS Value
    FROM Users
    WHERE IsDeleted = 0 AND IsActive = 1
    
    UNION ALL
    
    SELECT 
        'Verified Investors',
        CAST(COUNT(*) AS NVARCHAR(50))
    FROM Users
    WHERE KYCStatus = 'Approved' AND IsDeleted = 0
    
    UNION ALL
    
    SELECT 
        'Total Properties',
        CAST(COUNT(*) AS NVARCHAR(50))
    FROM Properties
    WHERE IsDeleted = 0 AND IsActive = 1
    
    UNION ALL
    
    SELECT 
        'Total Invested',
        '$' + FORMAT(SUM(TotalInvested), '0.00')
    FROM Users
    WHERE IsDeleted = 0
    
    UNION ALL
    
    SELECT 
        'Total Distributions',
        '$' + FORMAT(SUM(TotalDistributions), '0.00')
    FROM Users
    WHERE IsDeleted = 0
    
    UNION ALL
    
    SELECT 
        'Active Investments',
        CAST(COUNT(*) AS NVARCHAR(50))
    FROM Investments
    WHERE Status = 'Active' AND IsDeleted = 0
    
    UNION ALL
    
    SELECT 
        'Portfolio Value',
        '$' + FORMAT(SUM(PortfolioValue), '0.00')
    FROM Users
    WHERE IsDeleted = 0;
END;

GO

PRINT 'Stored procedures created successfully!';
PRINT '';
PRINT 'Available procedures:';
PRINT '  sp_GetUserPortfolio @UserID=1';
PRINT '  sp_GetUserInvestments @UserID=1';
PRINT '  sp_GetActiveProperties';
PRINT '  sp_GetPropertiesByCity @City=''Bangkok''';
PRINT '  sp_GetPropertyMetrics @PropertyID=1';
PRINT '  sp_GetRecentDistributions @Months=6';
PRINT '  sp_GetInvestorEarnings @UserID=1, @Months=12';
PRINT '  sp_GetTopInvestors @TopN=10';
PRINT '  sp_GetDashboardStats';
