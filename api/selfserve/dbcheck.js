// Temporary diagnostic — does the function see the Supabase env? (booleans only)
const db = require("../_db");
module.exports = async function handler(req, res) {
  res.status(200).json({
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlLen: (process.env.SUPABASE_URL || "").length,
    keyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length,
    dbConfigured: db.dbConfigured(),
    node: process.version,
  });
};
