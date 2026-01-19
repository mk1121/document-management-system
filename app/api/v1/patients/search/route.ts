import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';
import { withCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ message: 'Query parameter q is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT PATIENT_ID, PATIENT_NAME, CONTACT_NO, AGE, GENDER, DOCTOR_NAME, TO_CHAR(DOB, 'YYYY-MM-DD') as DOB_STR
      FROM PATIENT_INFO
      WHERE LOWER(PATIENT_NAME) LIKE LOWER(:term)
         OR CONTACT_NO LIKE :term
         OR LOWER(PATIENT_ID) LIKE LOWER(:term)
         OR TO_CHAR(AGE) LIKE :term
         OR LOWER(ADDRESS) LIKE LOWER(:term)
         OR LOWER(DIST) LIKE LOWER(:term)
         OR LOWER(PO) LIKE LOWER(:term)
         OR LOWER(PS) LIKE LOWER(:term)
         OR LOWER(PATIENT_TYPE) LIKE LOWER(:term)
         OR LOWER(BRANCH_NAME) LIKE LOWER(:term)
      FETCH FIRST 50 ROWS ONLY`;

    const result = await connection.execute(
      sql,
      { term: `%${q}%` },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    const patients = result.rows.map((row: any) => ({
      id: row.PATIENT_ID,
      name: row.PATIENT_NAME,
      phone: row.CONTACT_NO,
      age: row.AGE,
      gender: row.GENDER,
      doctorName: row.DOCTOR_NAME,
      dob: row.DOB_STR,
    }));

    return withCorsHeaders(NextResponse.json(patients), req.headers.get('origin'));
  } catch (err: any) {
    console.error('Search Error:', err);
    return withCorsHeaders(
      NextResponse.json({ message: 'Search failed', error: err.message }, { status: 500 }),
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
