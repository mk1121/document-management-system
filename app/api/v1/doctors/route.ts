import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';

export async function GET(_req: NextRequest) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT DR_ID, DR_NAME FROM DOCTOR_INFO ORDER BY DR_NAME ASC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    // Transform to simple array
    const doctors = result.rows.map((row: any) => ({
      id: row.DR_ID,
      name: row.DR_NAME,
    }));
    return NextResponse.json(doctors);
  } catch (err: any) {
    console.error('Error fetching doctors:', err);
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 });
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
