import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const salt_bytes = 16;
const key_bytes = 64;
const scrypt_cost = 2 ** 14;
const scrypt_block_size = 8;
const scrypt_parallelization = 1;
const scrypt_max_memory = 64 * 1024 * 1024;

function derive_key(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      key_bytes,
      {
        N: scrypt_cost,
        r: scrypt_block_size,
        p: scrypt_parallelization,
        maxmem: scrypt_max_memory,
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

export async function hash_password(password: string): Promise<string> {
  const salt = randomBytes(salt_bytes);
  const derived_key = await derive_key(password, salt);
  return [
    "scrypt",
    scrypt_cost,
    scrypt_block_size,
    scrypt_parallelization,
    salt.toString("base64url"),
    derived_key.toString("base64url"),
  ].join("$");
}

export async function verify_password(password: string, stored_hash: string): Promise<boolean> {
  const [
    algorithm,
    cost_value,
    block_size_value,
    parallelization_value,
    salt_value,
    key_value,
    ...unexpected_parts
  ] = stored_hash.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(cost_value) !== scrypt_cost ||
    Number(block_size_value) !== scrypt_block_size ||
    Number(parallelization_value) !== scrypt_parallelization ||
    !salt_value ||
    !key_value ||
    unexpected_parts.length > 0
  ) {
    return false;
  }

  const salt = Buffer.from(salt_value, "base64url");
  const expected_key = Buffer.from(key_value, "base64url");
  if (salt.length !== salt_bytes || expected_key.length !== key_bytes) {
    return false;
  }

  const actual_key = await derive_key(password, salt);
  return timingSafeEqual(expected_key, actual_key);
}
