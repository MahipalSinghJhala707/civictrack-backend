const { jwtDecrypt } = require("jose");
const crypto = require("crypto");

module.exports = async (req, res, next) => {
  try {
    // Ensure JWT_SECRET is configured
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
      const err = new Error("JWT secret key is not configured.");
      err.statusCode = 500;
      throw err;
    }

    const token = req.cookies?.token;

    if (!token) {
      const err = new Error("Authentication required.");
      err.statusCode = 401;
      throw err;
    }

    // Security check: JWE tokens have 5 parts (header.encrypted_key.iv.ciphertext.tag)
    // This ensures the token is properly encrypted
    const tokenParts = token.split(".");
    if (tokenParts.length !== 5) {
      const err = new Error("Invalid token format - token must be encrypted.");
      err.statusCode = 401;
      throw err;
    }

    // CRITICAL: Decrypt token using JWE (JSON Web Encryption)
    // The payload is encrypted with AES-256-GCM - it CANNOT be decoded without the secret
    // This provides encryption (payload hidden) and integrity protection
    // Derive the same 32-byte (256-bit) key from JWT_SECRET using PBKDF2
    // This must match the key derivation used during encryption
    const secretKey = crypto.pbkdf2Sync(
      process.env.JWT_SECRET,
      "civictrack-salt", // Same salt as used in encryption
      100000, // Same iterations as used in encryption
      32, // 32 bytes = 256 bits for AES-256
      "sha256"
    );
    
    let decoded;
    try {
      const { payload } = await jwtDecrypt(token, secretKey, {
        keyManagementAlgorithms: ["dir"], // Direct key encryption
        contentEncryptionAlgorithms: ["A256GCM"] // AES-256-GCM for encryption
      });
      decoded = payload;
    } catch (decryptError) {
      // If decryption fails, token is invalid - reject immediately
      // This means the token was not encrypted with our secret or has been tampered with
      const err = new Error("Invalid or tampered token. Cannot decrypt without secret.");
      err.statusCode = 401;
      throw err;
    }

    // Additional security: Verify token structure
    if (!decoded || typeof decoded !== "object") {
      const err = new Error("Invalid token structure.");
      err.statusCode = 401;
      throw err;
    }

    // Validate decoded payload
    if (!decoded.id || !decoded.role) {
      const err = new Error("Invalid token payload.");
      err.statusCode = 401;
      throw err;
    }

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (err) {
    // JWE/JWT error handling
    if (err.code === "ERR_JWT_EXPIRED" || err.message?.includes("expired")) {
      err = new Error("Session expired. Please log in again.");
      err.statusCode = 401;
    } else if (err.code === "ERR_JWT_INVALID" || err.message?.includes("decrypt") || err.message?.includes("Invalid")) {
      err = new Error("Invalid or tampered token. Cannot decrypt without secret.");
      err.statusCode = 401;
    } else if (!err.statusCode) {
      err.statusCode = 401;
    }

    next(err);
  }
};
