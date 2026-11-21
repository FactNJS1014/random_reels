import { database, getPool, sql } from '../config/db.js';

const COMMON_RANDOM_DDL = `
IF OBJECT_ID(N'dbo.COMMON_RANDOM', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.COMMON_RANDOM (
    ID            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_COMMON_RANDOM PRIMARY KEY,
    NUMBERS       NVARCHAR(MAX)     NOT NULL,
    RESULT_NUMBER NVARCHAR(50)      NULL,
    TOTAL_BALLS   INT               NOT NULL CONSTRAINT DF_COMMON_RANDOM_TOTAL_BALLS DEFAULT (0),
    SPIN_SECONDS  INT               NOT NULL CONSTRAINT DF_COMMON_RANDOM_SPIN_SECONDS DEFAULT (5),
    CREATED_AT    DATETIME2(0)      NOT NULL CONSTRAINT DF_COMMON_RANDOM_CREATED_AT DEFAULT (SYSDATETIME()),
    UPDATED_AT    DATETIME2(0)      NULL
  );
END;
`;

const MEMBER_COMMON_DDL = `
IF OBJECT_ID(N'dbo.Member_common', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Member_common (
    ID          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Member_common PRIMARY KEY,
    MEMBER_CODE NVARCHAR(50)      NOT NULL,
    MEMBER_NAME NVARCHAR(200)     NOT NULL,
    EMAIL       NVARCHAR(200)     NULL,
    IS_ACTIVE   BIT               NOT NULL CONSTRAINT DF_Member_common_IS_ACTIVE DEFAULT (1),
    CREATED_AT  DATETIME2(0)      NOT NULL CONSTRAINT DF_Member_common_CREATED_AT DEFAULT (SYSDATETIME()),
    UPDATED_AT  DATETIME2(0)      NULL
  );

  CREATE UNIQUE INDEX UX_Member_common_MEMBER_CODE ON dbo.Member_common (MEMBER_CODE);
END;
`;

export async function ensureTables() {
  const pool = await getPool();
  await pool.request().query(COMMON_RANDOM_DDL);
  await pool.request().query(MEMBER_COMMON_DDL);
}

/**
 * Creates the target database on the SQL Server instance when it is missing.
 * The name is validated because database identifiers cannot be parameterized.
 */
export async function createDatabaseIfMissing() {
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(`Invalid database name "${database}". Use letters, numbers and underscores only.`);
  }

  const pool = await getPool();
  const existing = await pool
    .request()
    .input('name', sql.NVarChar(128), database)
    .query('SELECT name FROM sys.databases WHERE name = @name');

  if (existing.recordset.length > 0) return false;

  await pool.request().query(`CREATE DATABASE [${database}]`);
  return true;
}
