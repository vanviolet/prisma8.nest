import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_COST = 2 ** 14;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_BYTES,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [
    algorithm,
    costValue,
    blockSizeValue,
    parallelizationValue,
    saltValue,
    keyValue,
    ...unexpectedParts
  ] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(costValue) !== SCRYPT_COST ||
    Number(blockSizeValue) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelizationValue) !== SCRYPT_PARALLELIZATION ||
    !saltValue ||
    !keyValue ||
    unexpectedParts.length > 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedKey = Buffer.from(keyValue, "base64url");
  if (salt.length !== SALT_BYTES || expectedKey.length !== KEY_BYTES) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(expectedKey, actualKey);
}
