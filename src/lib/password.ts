import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

function scrypt(password: string, salt: string | Buffer, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] =
    storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const expected = Buffer.from(hashValue, "base64url");
  if (
    Number(cost) !== COST ||
    Number(blockSize) !== BLOCK_SIZE ||
    Number(parallelization) !== PARALLELIZATION
  ) {
    return false;
  }

  const derivedKey = await scrypt(
    password,
    Buffer.from(saltValue, "base64url"),
    expected.length
  );

  return (
    expected.length === derivedKey.length &&
    timingSafeEqual(expected, derivedKey)
  );
}

export async function spendPasswordHashTime(password: string) {
  await scrypt(password, "qa-report-invalid-user", KEY_LENGTH);
}
