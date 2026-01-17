module.exports = {
  user: process.env.DB_USER || 'nts',
  password: process.env.DB_PASSWORD || 'nts',
  connectString: process.env.DB_CONNECT_STRING || '//192.168.1.154:1523/ORCLPDB1',
  // "Thin" mode is the default in node-oracledb 6+, which does not require Instant Client
};
