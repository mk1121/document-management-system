require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const morgan = require('morgan');
const dbConfig = require('./dbConfig');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
// Increase payload limit to handle multiple images (200mb for lossless PNGs)
app.use(express.json({ limit: '200mb' }));

// Helper to strip Base64 prefix (data:image/jpeg;base64,...)
const parseBase64Data = (dataString) => {
  const matches = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  // Fallback if no prefix sent
  return Buffer.from(dataString, 'base64');
};

// --- ROUTES ---

// Health Check
app.get('/api/health', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute('SELECT 1 FROM DUAL');
    res.json({ status: 'online', db: 'connected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'offline', error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
});

// Sync Endpoint
app.post('/api/v1/documents/sync', async (req, res) => {
  let connection;
  try {
    const { transactionId, metadata, attachments } = req.body;

    if (!transactionId || !metadata || !attachments) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload structure' });
    }

    connection = await oracledb.getConnection(dbConfig);

    // 1. Check idempotency (avoid duplicate inserts for same transactionId)
    const checkSql = `SELECT ID FROM DOC_MASTERS WHERE FRONTEND_UUID = :uuid`;
    const checkResult = await connection.execute(checkSql, [transactionId]);

    if (checkResult.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        oracleRecordId: checkResult.rows[0][0],
        message: 'Record already exists (Idempotent)',
      });
    }

    // 2. Insert Master Record
    // Note: capturedAt comes as ms timestamp. Converting to Oracle Date/Timestamp.
    const sqlMaster = `
      INSERT INTO DOC_MASTERS (FRONTEND_UUID, FULL_NAME, DOB, PHONE, CREATED_AT)
      VALUES (:uuid, :name, TO_DATE(:dob, 'YYYY-MM-DD'), :phone, TIMESTAMP '1970-01-01 00:00:00' + NUMTODSINTERVAL(:createdAt / 1000, 'SECOND'))
      RETURNING ID INTO :id
    `;

    const resultMaster = await connection.execute(sqlMaster, {
      uuid: transactionId,
      name: metadata.fullName,
      dob: metadata.dateOfBirth, // Expecting YYYY-MM-DD from frontend
      phone: metadata.phoneNumber,
      createdAt: metadata.capturedAt,
      id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
    });

    const masterId = resultMaster.outBinds.id[0];

    // 3. Insert Images (Details)
    const sqlImage = `
      INSERT INTO DOC_IMAGES (MASTER_ID, SEQUENCE_NO, MIME_TYPE, IMAGE_DATA)
      VALUES (:mid, :seq, :mime, :data)
    `;

    for (const img of attachments) {
      const buffer = parseBase64Data(img.data);

      await connection.execute(sqlImage, {
        mid: masterId,
        seq: img.sequence,
        mime: img.mimeType,
        data: buffer,
      });
    }

    // 4. Commit Transaction
    await connection.commit();

    console.log(`Successfully synced doc ID: ${masterId}`);
    res.json({
      status: 'success',
      oracleRecordId: masterId,
      message: 'Data committed successfully',
    });
  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ status: 'error', code: 'ORA-SYNC-FAIL', message: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Connecting to Oracle at ${dbConfig.connectString}`);
});
