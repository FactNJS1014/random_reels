import { getPool, sql } from '../config/db.js';

function mapRow(row) {
  return {
    id: row.ID,
    memberCode: row.MEMBER_CODE,
    memberName: row.MEMBER_NAME,
    email: row.EMAIL,
    isActive: Boolean(row.IS_ACTIVE),
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

export async function list({ page = 1, pageSize = 20, search = '' } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const keyword = `%${search}%`;

  const countResult = await pool
    .request()
    .input('search', sql.NVarChar(200), keyword)
    .query(`
      SELECT COUNT(1) AS TOTAL
      FROM dbo.Member_common
      WHERE @search = '%%' OR MEMBER_CODE LIKE @search OR MEMBER_NAME LIKE @search
    `);

  const result = await pool
    .request()
    .input('search', sql.NVarChar(200), keyword)
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .query(`
      SELECT ID, MEMBER_CODE, MEMBER_NAME, EMAIL, IS_ACTIVE, CREATED_AT, UPDATED_AT
      FROM dbo.Member_common
      WHERE @search = '%%' OR MEMBER_CODE LIKE @search OR MEMBER_NAME LIKE @search
      ORDER BY ID DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  return {
    items: result.recordset.map(mapRow),
    total: countResult.recordset[0]?.TOTAL ?? 0,
    page,
    pageSize,
  };
}

export async function getById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT ID, MEMBER_CODE, MEMBER_NAME, EMAIL, IS_ACTIVE, CREATED_AT, UPDATED_AT
      FROM dbo.Member_common
      WHERE ID = @id
    `);

  return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

export async function create({ memberCode, memberName, email, isActive }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('memberCode', sql.NVarChar(50), memberCode)
    .input('memberName', sql.NVarChar(200), memberName)
    .input('email', sql.NVarChar(200), email ?? null)
    .input('isActive', sql.Bit, isActive === false ? 0 : 1)
    .query(`
      INSERT INTO dbo.Member_common (MEMBER_CODE, MEMBER_NAME, EMAIL, IS_ACTIVE)
      OUTPUT INSERTED.ID, INSERTED.MEMBER_CODE, INSERTED.MEMBER_NAME, INSERTED.EMAIL,
             INSERTED.IS_ACTIVE, INSERTED.CREATED_AT, INSERTED.UPDATED_AT
      VALUES (@memberCode, @memberName, @email, @isActive)
    `);

  return mapRow(result.recordset[0]);
}

export async function update(id, patch) {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const sets = [];

  if (patch.memberCode !== undefined) {
    sets.push('MEMBER_CODE = @memberCode');
    request.input('memberCode', sql.NVarChar(50), patch.memberCode);
  }
  if (patch.memberName !== undefined) {
    sets.push('MEMBER_NAME = @memberName');
    request.input('memberName', sql.NVarChar(200), patch.memberName);
  }
  if (patch.email !== undefined) {
    sets.push('EMAIL = @email');
    request.input('email', sql.NVarChar(200), patch.email);
  }
  if (patch.isActive !== undefined) {
    sets.push('IS_ACTIVE = @isActive');
    request.input('isActive', sql.Bit, patch.isActive ? 1 : 0);
  }

  sets.push('UPDATED_AT = SYSDATETIME()');

  const result = await request.query(`
    UPDATE dbo.Member_common
    SET ${sets.join(', ')}
    OUTPUT INSERTED.ID, INSERTED.MEMBER_CODE, INSERTED.MEMBER_NAME, INSERTED.EMAIL,
           INSERTED.IS_ACTIVE, INSERTED.CREATED_AT, INSERTED.UPDATED_AT
    WHERE ID = @id
  `);

  return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

export async function remove(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('DELETE FROM dbo.Member_common WHERE ID = @id');

  return result.rowsAffected[0] > 0;
}
