const GSM = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const EXTENDED = new Set(Array.from('\f^{}\\[~]|€'));

export function smsSegments(value) {
  const text = String(value ?? '');
  const gsm = Array.from(text).every((char) => GSM.has(char) || EXTENDED.has(char));
  const length = gsm ? Array.from(text).reduce((sum, char) => sum + (EXTENDED.has(char) ? 2 : 1), 0) : text.length;
  return length <= (gsm ? 160 : 70) ? 1 : Math.ceil(length / (gsm ? 153 : 67));
}
export function fitsSingleSms(value) {
  const text = String(value ?? '');
  const chars = Array.from(text);
  const gsm = chars.every((char) => GSM.has(char) || EXTENDED.has(char));
  return gsm ? chars.reduce((n, char) => n + (EXTENDED.has(char) ? 2 : 1), 0) <= 150 : text.length <= 70;
}
export function boundedSms(value, responseCode) {
  const suffix = `\n${responseCode}: ALERT RECEIVED / ALL CLEAR`;
  const chars = Array.from(String(value ?? '').trim()).slice(0, 160);
  while (chars.length && !fitsSingleSms(chars.join('') + suffix)) chars.pop();
  const text = chars.join('').trimEnd() + suffix;
  if (!fitsSingleSms(text)) throw new Error('SMS response code exceeds a single segment.');
  return text;
}
