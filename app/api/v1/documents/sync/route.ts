import { NextRequest, NextResponse } from 'next/server';
import oracledb from 'oracledb';
import dbConfig from '@/backend/dbConfig';

export async function POST(req: NextRequest) {
  const { transactionId, metadata, attachments, username } = await req.json();

  if (!transactionId || !metadata || !attachments) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // 1. Check Idempotency based on UUID (frontend_uuid)
    const checkSql = `SELECT PATIENT_ID FROM PATIENT_INFO WHERE FRONTEND_UUID = :uuid`;
    const checkResult = await connection.execute(checkSql, {
      uuid: transactionId,
    });

    if (checkResult.rows.length > 0) {
      // Already synced
      return NextResponse.json({
        message: 'Document already synced',
        documentId: checkResult.rows[0][0], // PATIENT_ID
      });
    }

    // 2. Insert Master Record (PATIENT_INFO)
    const sqlMaster = `
      INSERT INTO PATIENT_INFO (
        FRONTEND_UUID, PATIENT_NAME, GENDER, DOB, AGE, CONTACT_NO, ADDRESS, DOCTOR_NAME, CREATED_AT,
        BRANCH_NAME, PATIENT_TYPE, APP_DATE, PO, PS, DIST, EMG_CONTACT_PERSON, EMG_CONTACT_NO, REF_BY,
        USER_ID
      )
      VALUES (
        :uuid, :name, :gender, TO_DATE(:dob, 'YYYY-MM-DD'), :age, :contact, :address, :doctorName, 
        TIMESTAMP '1970-01-01 00:00:00' + NUMTODSINTERVAL(:createdAt / 1000, 'SECOND'),
        :branchName, :patientType, TO_DATE(:appDate, 'YYYY-MM-DD'), :po, :ps, :dist, :emgPerson, :emgNo, :refBy,
        :userId
      )
      RETURNING PATIENT_ID INTO :id
    `;

    const resultMaster = await connection.execute(sqlMaster, {
      uuid: transactionId,
      name: metadata.fullName,
      gender: metadata.gender || null,
      dob: metadata.dateOfBirth,
      age: parseInt(metadata.age) || null,
      contact: metadata.phoneNumber,
      address: metadata.address || null,
      doctorName: metadata.doctorName || null,
      createdAt: typeof metadata.capturedAt === 'number' ? metadata.capturedAt : Date.now(),
      branchName: metadata.branchName || null,
      patientType: metadata.patientType || null,
      appDate: metadata.appDate || null,
      po: metadata.po || null,
      ps: metadata.ps || null,
      dist: metadata.dist || null,
      emgPerson: metadata.emgContactPerson || null,
      emgNo: metadata.emgContactNo || null,
      refBy: metadata.refBy || null,
      userId: username || null,
      id: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
    });

    const masterId = (resultMaster.outBinds as any).id[0];
    console.log('Inserted Patient ID:', masterId);

    for (const att of attachments) {
      const base64Data = att.data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const sqlImage = `
        INSERT INTO PATIENT_DOC_INFO (PATIENT_ID, SEQUENCE_NO, PHOTO_MIME_TYPE, patient_doc, NEXT_APP, USER_ID)
        VALUES (
          :mid, 
          :seq, 
          :mime, 
          :data, 
          CASE WHEN :nextApp IS NOT NULL THEN TO_DATE(:nextApp, 'YYYY-MM-DD') ELSE NULL END,
          :userId
        )
      `;

      await connection.execute(sqlImage, {
        mid: masterId,
        seq: att.sequence,
        mime: att.mimeType,
        data: buffer,
        nextApp: att.nextApp || null,
        userId: username || null,
      });
    }

    await connection.commit();

    return NextResponse.json({
      message: 'Sync successful',
      documentId: masterId,
    });
  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json(
      { message: 'Internal Server Error', error: err.message },
      { status: 500 },
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
