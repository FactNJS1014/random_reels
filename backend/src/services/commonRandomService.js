import { getPool, sql } from '../config/db.js';

function mapRow(row) {
  return {
    id: row.ID,
    numbers: String(row.NUMBERS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    resultNumber: row.RESULT_NUMBER,
    totalBalls: row.TOTAL_BALLS,
    spinSeconds: row.SPIN_SECONDS,
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

export async function list({ page = 1, pageSize = 10 } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const countResult = await pool.request().query('SELECT COUNT(1) AS TOTAL FROM dbo.COMMON_RANDOM');
  const total = countResult.recordset[0]?.TOTAL ?? 0;

  const result = await pool
    .request()
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .query(`
      SELECT ID, NUMBERS, RESULT_NUMBER, TOTAL_BALLS, SPIN_SECONDS, CREATED_AT, UPDATED_AT
      FROM dbo.COMMON_RANDOM
      ORDER BY ID DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  return { items: result.recordset.map(mapRow), total, page, pageSize };
}

export async function getById(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT ID, NUMBERS, RESULT_NUMBER, TOTAL_BALLS, SPIN_SECONDS, CREATED_AT, UPDATED_AT
      FROM dbo.COMMON_RANDOM
      WHERE ID = @id
    `);

  return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

export async function create({ numbers, resultNumber, totalBalls, spinSeconds }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('numbers', sql.NVarChar(sql.MAX), numbers.join(','))
    .input('resultNumber', sql.NVarChar(50), resultNumber ?? null)
    .input('totalBalls', sql.Int, totalBalls ?? numbers.length)
    .input('spinSeconds', sql.Int, spinSeconds ?? 5)
    .query(`
      INSERT INTO dbo.COMMON_RANDOM (NUMBERS, RESULT_NUMBER, TOTAL_BALLS, SPIN_SECONDS)
      OUTPUT INSERTED.ID, INSERTED.NUMBERS, INSERTED.RESULT_NUMBER, INSERTED.TOTAL_BALLS,
             INSERTED.SPIN_SECONDS, INSERTED.CREATED_AT, INSERTED.UPDATED_AT
      VALUES (@numbers, @resultNumber, @totalBalls, @spinSeconds)
    `);

  return mapRow(result.recordset[0]);
}

export async function update(id, patch) {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const sets = [];

  if (patch.numbers !== undefined) {
    sets.push('NUMBERS = @numbers');
    request.input('numbers', sql.NVarChar(sql.MAX), patch.numbers.join(','));
  }
  if (patch.resultNumber !== undefined) {
    sets.push('RESULT_NUMBER = @resultNumber');
    request.input('resultNumber', sql.NVarChar(50), patch.resultNumber);
  }
  if (patch.totalBalls !== undefined) {
    sets.push('TOTAL_BALLS = @totalBalls');
    request.input('totalBalls', sql.Int, patch.totalBalls);
  }
  if (patch.spinSeconds !== undefined) {
    sets.push('SPIN_SECONDS = @spinSeconds');
    request.input('spinSeconds', sql.Int, patch.spinSeconds);
  }

  sets.push('UPDATED_AT = SYSDATETIME()');

  const result = await request.query(`
    UPDATE dbo.COMMON_RANDOM
    SET ${sets.join(', ')}
    OUTPUT INSERTED.ID, INSERTED.NUMBERS, INSERTED.RESULT_NUMBER, INSERTED.TOTAL_BALLS,
           INSERTED.SPIN_SECONDS, INSERTED.CREATED_AT, INSERTED.UPDATED_AT
    WHERE ID = @id
  `);

  return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

export async function removeAll() {
  const pool = await getPool();
  const result = await pool.request().query('DELETE FROM dbo.COMMON_RANDOM');

  return result.rowsAffected[0] ?? 0;
}

export async function remove(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('DELETE FROM dbo.COMMON_RANDOM WHERE ID = @id');

  return result.rowsAffected[0] > 0;
}
