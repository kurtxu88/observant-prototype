// Temporary diagnostic. SUPABASE_URL is not secret; key shown as prefix only.
module.exports = async function handler(req, res) {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  res.status(200).json({
    url: url,
    urlEndsWithSlash: /\/$/.test(url),
    keyLen: key.length,
    keyPrefix: key.slice(0, 8),   // "eyJhbGci" = JWT service_role  ·  "sb_secre" = new secret key
  });
};
