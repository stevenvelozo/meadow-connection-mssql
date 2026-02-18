-- Bookstore schema and seed data for meadow-connection-mssql tests

CREATE DATABASE bookstore;
GO

USE bookstore;
GO

-- [ FableTest ] - Simple table used by the basic connection test
CREATE TABLE [dbo].[FableTest]
    (
        [IDFableTest] INT NOT NULL IDENTITY PRIMARY KEY,
        [Title] VARCHAR(200) DEFAULT '',
        [Value] VARCHAR(200) DEFAULT ''
    );
GO

-- [ Book ]
CREATE TABLE [dbo].[Book]
    (
        [IDBook] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDBook] VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
        [CreateDate] DATETIME,
        [CreatingIDUser] INT NOT NULL DEFAULT 0,
        [UpdateDate] DATETIME,
        [UpdatingIDUser] INT NOT NULL DEFAULT 0,
        [Deleted] TINYINT DEFAULT 0,
        [DeleteDate] DATETIME,
        [DeletingIDUser] INT NOT NULL DEFAULT 0,
        [Title] VARCHAR(200) DEFAULT '',
        [Type] VARCHAR(32) DEFAULT '',
        [Genre] VARCHAR(128) DEFAULT '',
        [ISBN] VARCHAR(64) DEFAULT '',
        [Language] VARCHAR(12) DEFAULT '',
        [ImageURL] VARCHAR(254) DEFAULT '',
        [PublicationYear] INT NOT NULL DEFAULT 0
    );
GO

-- [ BookAuthorJoin ]
CREATE TABLE [dbo].[BookAuthorJoin]
    (
        [IDBookAuthorJoin] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDBookAuthorJoin] VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
        [IDBook] INT NOT NULL DEFAULT 0,
        [IDAuthor] INT NOT NULL DEFAULT 0
    );
GO

-- [ Author ]
CREATE TABLE [dbo].[Author]
    (
        [IDAuthor] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDAuthor] VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
        [CreateDate] DATETIME,
        [CreatingIDUser] INT NOT NULL DEFAULT 0,
        [UpdateDate] DATETIME,
        [UpdatingIDUser] INT NOT NULL DEFAULT 0,
        [Deleted] TINYINT DEFAULT 0,
        [DeleteDate] DATETIME,
        [DeletingIDUser] INT NOT NULL DEFAULT 0,
        [Name] VARCHAR(200) DEFAULT ''
    );
GO

-- [ BookPrice ]
CREATE TABLE [dbo].[BookPrice]
    (
        [IDBookPrice] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDBookPrice] VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
        [CreateDate] DATETIME,
        [CreatingIDUser] INT NOT NULL DEFAULT 0,
        [UpdateDate] DATETIME,
        [UpdatingIDUser] INT NOT NULL DEFAULT 0,
        [Deleted] TINYINT DEFAULT 0,
        [DeleteDate] DATETIME,
        [DeletingIDUser] INT NOT NULL DEFAULT 0,
        [Price] DECIMAL(8,2),
        [StartDate] DATETIME,
        [EndDate] DATETIME,
        [Discountable] TINYINT DEFAULT 0,
        [CouponCode] VARCHAR(16) DEFAULT '',
        [IDBook] INT NOT NULL DEFAULT 0
    );
GO

-- [ Review ]
CREATE TABLE [dbo].[Review]
    (
        [IDReviews] INT NOT NULL IDENTITY PRIMARY KEY,
        [GUIDReviews] VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
        [CreateDate] DATETIME,
        [CreatingIDUser] INT NOT NULL DEFAULT 0,
        [UpdateDate] DATETIME,
        [UpdatingIDUser] INT NOT NULL DEFAULT 0,
        [Deleted] TINYINT DEFAULT 0,
        [DeleteDate] DATETIME,
        [DeletingIDUser] INT NOT NULL DEFAULT 0,
        [Text] TEXT,
        [Rating] INT NOT NULL DEFAULT 0,
        [IDBook] INT NOT NULL DEFAULT 0
    );
GO

-- Seed data for FableTest
INSERT INTO FableTest (Title, Value) VALUES
    ('The Hunger Games', 'Test Value 1'),
    ('Harry Potter and the Philosopher''s Stone', 'Test Value 2'),
    ('Twilight', 'Test Value 3'),
    ('To Kill a Mockingbird', 'Test Value 4'),
    ('The Great Gatsby', 'Test Value 5'),
    ('The Fault in Our Stars', 'Test Value 6'),
    ('The Hobbit', 'Test Value 7'),
    ('The Catcher in the Rye', 'Test Value 8'),
    ('Angels & Demons', 'Test Value 9'),
    ('Pride and Prejudice', 'Test Value 10'),
    ('The Kite Runner', 'Test Value 11'),
    ('Divergent', 'Test Value 12');
GO

-- Seed data for Book
INSERT INTO Book (Title, Type, Genre, ISBN, Language, PublicationYear) VALUES
    ('The Hunger Games', 'Paper', 'UNKNOWN', '439023483', 'eng', 2008),
    ('Harry Potter and the Philosopher''s Stone', 'Paper', 'UNKNOWN', '439554934', 'eng', 1997),
    ('Twilight', 'Paper', 'UNKNOWN', '316015849', 'en-US', 2005),
    ('To Kill a Mockingbird', 'Paper', 'UNKNOWN', '61120081', 'eng', 1960),
    ('The Great Gatsby', 'Paper', 'UNKNOWN', '743273567', 'eng', 1925),
    ('The Fault in Our Stars', 'Paper', 'UNKNOWN', '525478817', 'eng', 2012),
    ('The Hobbit', 'Paper', 'UNKNOWN', '618260307', 'en-US', 1937),
    ('The Catcher in the Rye', 'Paper', 'UNKNOWN', '316769177', 'eng', 1951),
    ('Angels & Demons', 'Paper', 'UNKNOWN', '1416524797', 'en-CA', 2000),
    ('Pride and Prejudice', 'Paper', 'UNKNOWN', '679783261', 'eng', 1813),
    ('The Kite Runner', 'Paper', 'UNKNOWN', '1594480001', 'eng', 2003),
    ('Divergent', 'Paper', 'UNKNOWN', '62024035', 'eng', 2011);
GO
