import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';
import { withCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      SELECT FILE_ID, SEQUENCE_NO, PHOTO_MIME_TYPE, PATIENT_DOC, TO_CHAR(NEXT_APP, 'YYYY-MM-DD') as NEXT_APP_STR
      FROM PATIENT_DOC_INFO
      WHERE PATIENT_ID = :pid
      ORDER BY SEQUENCE_NO ASC
    `;

    const result = await connection.execute(
      sql,
      { pid: id },
      {
        fetchInfo: {
          PATIENT_DOC: { type: oracledb.BUFFER },
        },
      },
    );

    const images = [];
    for (const row of result.rows) {
      const fileId = row[0];
      const seq = row[1];
      const mime = row[2];
      const lob = row[3];
      const nextApp = row[4];

      if (lob) {
        let data = '';
        if (Buffer.isBuffer(lob)) {
          data = lob.toString('base64');
        } else {
          data = Buffer.from(lob).toString('base64');
        }

        images.push({
          fileId,
          sequence: seq,
          mimeType: mime,
          data: `data:${mime}; base64, ${data}`,
          nextApp,
        });
      }
    }
    return withCorsHeaders(NextResponse.json(images), _req.headers.get('origin'));
  } catch (err: any) {
    console.error('Get Images Error:', err);
    return withCorsHeaders(
      NextResponse.json(
        { message: 'Failed to get images', error: err.message },
        { status: 500 },
      ),
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { images, username } = await req.json();

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ message: 'No images provided' }, { status: 400 });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const seqRes = await connection.execute(
      `SELECT MAX(SEQUENCE_NO) FROM PATIENT_DOC_INFO WHERE PATIENT_ID = :pid`,
      { pid: id },
    );
    let maxSeq = seqRes.rows[0][0] || 0;

    const sqlImage = `
      INSERT INTO PATIENT_DOC_INFO(PATIENT_ID, SEQUENCE_NO, PHOTO_MIME_TYPE, PATIENT_DOC, USER_ID)
      VALUES(:pid, :seq, :mime, :data, :userId)
    `;

    for (const img of images) {
      maxSeq++;
      const base64Data = img.data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      await connection.execute(sqlImage, {
        pid: id,
        seq: maxSeq,
        mime: img.mimeType || 'image/png',
        data: buffer,
        userId: username || null,
      });
    }

    await connection.commit();
    return withCorsHeaders(
      NextResponse.json({
        message: 'Images added successfully',
        count: images.length,
      }),
      req.headers.get('origin'),
    );
  } catch (err: any) {
    console.error('Add Images Error:', err);
    return withCorsHeaders(
      NextResponse.json(
        { message: 'Failed to add images', error: err.message },
        { status: 500 },
      ),
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
