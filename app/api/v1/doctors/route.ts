import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';
import { withCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(req: NextRequest) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT DR_ID, DR_NAME FROM DOCTOR_INFO ORDER BY DR_NAME ASC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const doctors = result.rows.map((row: any) => ({
      id: row.DR_ID,
      name: row.DR_NAME,
    }));
    const response = NextResponse.json(doctors);
    return withCorsHeaders(response, req.headers.get('origin'));
  } catch (err: any) {
    console.error('Error fetching doctors:', err);
    return withCorsHeaders(
      NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 }),
      req.headers.get('origin'),
    );
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}
