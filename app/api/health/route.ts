import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/backend/dbConfig';

export async function GET(_req: NextRequest) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute('SELECT 1 FROM DUAL');
    return NextResponse.json({ status: 'online', db: 'connected' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ status: 'offline', error: err.message }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
}
