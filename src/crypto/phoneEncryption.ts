const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6uACih0i3Bnd1VYLcn62
GppGEhJ83433RrFtXzSl3vIdnlIfYJ1kYVJuft5Ax9Dwac9DFXmTgeZD1kXBjGHv
2cSIezcFwOPFSfFMSJLE6Ev+vmvEtbSg0kwEzQoirHvw94yHRi4JtU3pjyT2QwT4
UqYVsu5ENNRHJWAsKpdGA3o3eVT4j8rG4fVjT9hxVfIAGLf4EKdhet7V0qGxMfQg
Pbi1CfKFkMO+Ri0Ec/Gs1RTKmryrYimDuLwMPVODRgRbHVzup98114wcduSQC8MK
ALlUGpSeOcXQyZLbc8oK3+QFAB5TKWA9es0nzxMxitAh1hwy2jsNf4kzA2Qqpm3S
VwIDAQAB
-----END PUBLIC KEY-----`;

let cachedKey: CryptoKey | null = null;

const pemToDer = (pem: string) => {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
};

const bytesToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

const loadPublicKey = async (): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'spki',
    pemToDer(PUBLIC_KEY_PEM),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  return cachedKey;
};

export const encryptPhoneNumber = async (plain: string): Promise<string> => {
  const key = await loadPublicKey();
  const ct = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(plain),
  );
  return bytesToBase64(ct);
};
