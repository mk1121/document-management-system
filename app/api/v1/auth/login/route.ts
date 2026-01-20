import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';
import { withCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      {
        success: false,
        message: 'Username and password required',
      },
      { status: 400 },
    );
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Fetch User Type directly using the same logic as FD_LOGIN_F (Case Insensitive)
    const result = await connection.execute(
      `SELECT USER_TYPE 
       FROM USER_ACCESS_MT 
       WHERE UPPER(USER_NAME) = UPPER(:u) 
         AND UPPER(USER_PASSWORD) = UPPER(:p)`,
      {
        u: username,
        p: password,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return rows as objects
    );

    const rows = result.rows as any[];

    const origin = req.headers.get('origin');

    if (rows && rows.length > 0) {
      // Login Successful
      const userType = rows[0].USER_TYPE;

      return withCorsHeaders(
        NextResponse.json({
          success: true,
          message: 'Login successful',
          role: userType || 'Entry User', // Default if null
          username: username
        }),
        origin,
      );
    } else {
      return withCorsHeaders(
        NextResponse.json({
          success: false,
          message: 'Invalid credentials',
        }),
        origin,
      );
    }
  } catch (err: any) {
    console.error('Login error:', err);
    return withCorsHeaders(
      NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 }),
      req.headers.get('origin'),
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
