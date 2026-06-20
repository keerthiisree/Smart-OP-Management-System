/**
 * Cryptographic utility helpers using the browser's native Web Crypto API.
 * 
 * Provides ECDSA P-256 signature generation and DER encoding to match Python's 
 * cryptography library verification requirements.
 */

/**
 * Converts a raw PKCS#8 PEM string into an ArrayBuffer.
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Clean headers, footers, and whitespace
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
    
  const binaryString = window.atob(cleanPem);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a Web Crypto raw 64-byte signature (r | s) into an ASN.1 DER signature.
 * 
 * Python's cryptography library expects DER encoding (RFC 3279), whereas
 * browser Web Crypto returns raw IEEE P1363 (r and s concatenated).
 */
function rawSignatureToDer(rawSig: ArrayBuffer): string {
  const sig = new Uint8Array(rawSig);
  const r = sig.slice(0, 32);
  const s = sig.slice(32, 64);

  function cleanCoordinate(arr: Uint8Array): Uint8Array {
    let firstNonZero = 0;
    while (firstNonZero < arr.length && arr[firstNonZero] === 0) {
      firstNonZero++;
    }
    if (firstNonZero === arr.length) {
      return new Uint8Array([0]);
    }
    
    const trimmed = arr.slice(firstNonZero);
    // If the highest bit of the first byte is set, prepend 0x00 to avoid it being parsed as negative
    if ((trimmed[0] & 0x80) !== 0) {
      const res = new Uint8Array(trimmed.length + 1);
      res[0] = 0x00;
      res.set(trimmed, 1);
      return res;
    }
    return trimmed;
  }

  const rClean = cleanCoordinate(r);
  const sClean = cleanCoordinate(s);

  // DER format: Sequence tag (0x30) + length + [Integer tag (0x02) + length + r] + [Integer tag (0x02) + length + s]
  const derLength = rClean.length + sClean.length + 6;
  const der = new Uint8Array(derLength);
  
  let pos = 0;
  der[pos++] = 0x30; // Sequence
  der[pos++] = rClean.length + sClean.length + 4; // Sequence length
  
  der[pos++] = 0x02; // Integer tag for r
  der[pos++] = rClean.length;
  der.set(rClean, pos);
  pos += rClean.length;
  
  der[pos++] = 0x02; // Integer tag for s
  der[pos++] = sClean.length;
  der.set(sClean, pos);
  
  // Convert to hex string
  return Array.from(der)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Signs a message using a PEM private key and outputs a hex DER signature.
 */
export async function signMessage(privateKeyPem: string, message: string): Promise<string> {
  try {
    const keyData = pemToArrayBuffer(privateKeyPem);
    
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false,
      ["sign"]
    );
    
    const messageBytes = new TextEncoder().encode(message);
    const rawSignature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }
      },
      privateKey,
      messageBytes
    );
    
    return rawSignatureToDer(rawSignature);
  } catch (err) {
    console.error("Signature generation failed:", err);
    throw new Error("Failed to sign message locally. Verify private key formatting.");
  }
}
