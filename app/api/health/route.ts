import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';
import { withCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(_req: NextRequest) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute('SELECT 1 FROM DUAL');
    return withCorsHeaders(
      NextResponse.json({ status: 'online', db: 'connected' }),
      _req.headers.get('origin'),
    );
  } catch (err: any) {
    console.error(err);
    return withCorsHeaders(
      NextResponse.json({ status: 'offline', error: err.message }, { status: 500 }),
      _req.headers.get('origin'),
    );
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
