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

    const result = await connection.execute(
      `BEGIN
         :ret := CASE WHEN FD_LOGIN_F(:u, :p) THEN 1 ELSE 0 END;
       END;`,
      {
        u: username,
        p: password,
        ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
    );

    const isValid = (result.outBinds as any).ret === 1;

    const origin = req.headers.get('origin');
    if (isValid) {
      return withCorsHeaders(
        NextResponse.json({
          success: true,
          message: 'Login successful',
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
