import CryptoJS from "crypto-js";

const SECRET_KEY: string = "jPwhOLr5Xa4zjOZS1DzaumIm9IiSC7pQ5bIZERwgLco=";

/**
 * 生成签名
 * @param appId 应用 ID
 * @param timestamp 时间戳（毫秒 / 秒，需与后端约定一致）
 */
export function generateSignature(
  appId: string,
  timestamp: number | string
): string {
  const raw: string = `${appId}${timestamp}`;
  return CryptoJS.HmacSHA256(raw, SECRET_KEY).toString(CryptoJS.enc.Base64);
}
