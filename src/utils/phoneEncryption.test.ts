const importKey = vi.fn();
const encrypt = vi.fn();

const stubSubtle = () => {
  vi.stubGlobal('crypto', {
    subtle: { importKey, encrypt },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  // Fresh module instance each test so the module-level cachedKey is reset.
  vi.resetModules();
});

describe('encryptPhoneNumber', () => {
  it('imports the SPKI public key and encrypts the plaintext with RSA-OAEP', async () => {
    stubSubtle();
    const fakeKey = { type: 'public' } as unknown as CryptoKey;
    importKey.mockResolvedValue(fakeKey);
    // Ciphertext bytes: 0x00, 0x10, 0xff -> base64 of "\x00\x10\xff".
    encrypt.mockResolvedValue(new Uint8Array([0x00, 0x10, 0xff]).buffer);

    const { encryptPhoneNumber } = await import('./phoneEncryption');
    const result = await encryptPhoneNumber('+15551234567');

    expect(importKey).toHaveBeenCalledOnce();
    const [format, der, algo, extractable, usages] = importKey.mock.calls[0];
    expect(format).toBe('spki');
    expect(der).toBeInstanceOf(Uint8Array);
    expect((der as Uint8Array).length).toBeGreaterThan(0);
    expect(algo).toEqual({ name: 'RSA-OAEP', hash: 'SHA-256' });
    expect(extractable).toBe(false);
    expect(usages).toEqual(['encrypt']);

    expect(encrypt).toHaveBeenCalledOnce();
    const [encAlgo, usedKey, data] = encrypt.mock.calls[0];
    expect(encAlgo).toEqual({ name: 'RSA-OAEP' });
    expect(usedKey).toBe(fakeKey);
    // TextEncoder-encoded plaintext.
    expect(data).toEqual(new TextEncoder().encode('+15551234567'));

    expect(result).toBe(btoa('\x00\x10\xff'));
  });

  it('base64-encodes an empty ciphertext to an empty string', async () => {
    stubSubtle();
    importKey.mockResolvedValue({} as CryptoKey);
    encrypt.mockResolvedValue(new Uint8Array([]).buffer);

    const { encryptPhoneNumber } = await import('./phoneEncryption');
    const result = await encryptPhoneNumber('123');

    expect(result).toBe('');
  });

  it('caches the imported key across calls (importKey runs once)', async () => {
    stubSubtle();
    importKey.mockResolvedValue({} as CryptoKey);
    encrypt.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    const { encryptPhoneNumber } = await import('./phoneEncryption');
    await encryptPhoneNumber('111');
    await encryptPhoneNumber('222');

    expect(importKey).toHaveBeenCalledOnce();
    expect(encrypt).toHaveBeenCalledTimes(2);
  });

  it('propagates an importKey failure', async () => {
    stubSubtle();
    importKey.mockRejectedValue(new Error('bad key'));

    const { encryptPhoneNumber } = await import('./phoneEncryption');
    await expect(encryptPhoneNumber('123')).rejects.toThrow('bad key');
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('propagates an encrypt failure', async () => {
    stubSubtle();
    importKey.mockResolvedValue({} as CryptoKey);
    encrypt.mockRejectedValue(new Error('encrypt failed'));

    const { encryptPhoneNumber } = await import('./phoneEncryption');
    await expect(encryptPhoneNumber('123')).rejects.toThrow('encrypt failed');
  });
});
