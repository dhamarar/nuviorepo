import { HW, CW, NW } from './wasm.js';

export function makeAad(keyId, ephemeralPublic) {
    let k;
    if (typeof TextEncoder !== 'undefined') {
        k = new TextEncoder().encode(HW);
    } else if (typeof Buffer !== 'undefined') {
        k = Buffer.from(HW, 'utf8');
    } else {
        k = new Uint8Array(HW.length);
        for (let i = 0; i < HW.length; i++) k[i] = HW.charCodeAt(i);
    }

    const e = new Uint8Array(k.length + 3 + ephemeralPublic.length);
    e.set(k, 0);
    e[k.length] = 0;
    e[k.length + 1] = 2;
    e[k.length + 2] = keyId;
    e.set(ephemeralPublic, k.length + 3);
    return e;
}

export async function decrypt(encData, sealResult) {
    const encBytes = encData instanceof Uint8Array ? encData : new Uint8Array(encData);
    const iv = encBytes.slice(0, CW);
    const ciphertextWithTag = encBytes.slice(CW);
    const aad = makeAad(sealResult.keyId, sealResult.ephemeralPublic);

    // 1. Try standard Web Cryptography API (SubtleCrypto)
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
        try {
            const subtle = globalThis.crypto.subtle;
            const key = await subtle.importKey(
                "raw",
                sealResult.responseKey,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );
            const decrypted = await subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    additionalData: aad,
                    tagLength: 128
                },
                key,
                ciphertextWithTag
            );
            if (typeof TextDecoder !== 'undefined') {
                return new TextDecoder().decode(decrypted);
            } else if (typeof Buffer !== 'undefined') {
                return Buffer.from(decrypted).toString('utf8');
            }
        } catch (subtleErr) {
            console.warn("[Cinejoy] SubtleCrypto decrypt failed, attempting fallback:", subtleErr.message);
        }
    }

    // 2. Fallback to Node crypto if available
    try {
        const nodeCrypto = require('crypto');
        const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - NW);
        const tag = ciphertextWithTag.slice(ciphertextWithTag.length - NW);
        const decipher = nodeCrypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(sealResult.responseKey),
            Buffer.from(iv)
        );
        decipher.setAAD(Buffer.from(aad));
        decipher.setAuthTag(Buffer.from(tag));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (nodeErr) {
        throw new Error("No compatible AES-GCM engine found: " + nodeErr.message);
    }
}
