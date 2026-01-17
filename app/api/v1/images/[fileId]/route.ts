import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/dbConfig';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `DELETE FROM PATIENT_DOC_INFO WHERE FILE_ID = :fid`,
      { fid: fileId },
      { autoCommit: true },
    );
    return NextResponse.json({ message: 'Image deleted' });
  } catch (err: any) {
    console.error('Delete Error', err);
    return NextResponse.json({ message: 'Delete failed' }, { status: 500 });
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

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const { nextApp, username, data, mimeType } = await _req.json();

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    let sql, binds;
    if (data) {
      const buffer = Buffer.from(data, 'base64');
      sql = `
        UPDATE PATIENT_DOC_INFO
        SET PATIENT_DOC = :data,
            PHOTO_MIME_TYPE = :mime,
            LAST_UPDATE = :userId,
            LAST_UPDATE_DATE = SYSDATE
        WHERE FILE_ID = :fid
      `;
      binds = {
        data: buffer,
        mime: mimeType || 'image/png',
        userId: username || null,
        fid: fileId,
      };
    } else {
      sql = `
        UPDATE PATIENT_DOC_INFO
        SET NEXT_APP = TO_DATE(:nextApp, 'YYYY-MM-DD'),
            LAST_UPDATE = :userId,
            LAST_UPDATE_DATE = SYSDATE
        WHERE FILE_ID = :fid
      `;
      binds = {
        nextApp: nextApp || null,
        userId: username || null,
        fid: fileId,
      };
    }

    await connection.execute(sql, binds, { autoCommit: true });
    return NextResponse.json({ message: 'Image updated successfully' });
  } catch (err: any) {
    console.error('Update Image Error', err);
    return NextResponse.json({ message: 'Update failed', error: err.message }, { status: 500 });
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
