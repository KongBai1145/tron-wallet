use sha3::{Digest, Keccak256};
use sha2::Sha512;
use hmac::{Hmac, Mac};

type HmacSha512 = Hmac<Sha512>;

pub fn derive_address(seed: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
    let private_key = derive_private_key(seed)?;
    let public_key = derive_public_key(&private_key)?;
    let address = public_key_to_address(&public_key)?;
    Ok(address)
}

fn derive_private_key(seed: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut mac = HmacSha512::new_from_slice(b"tron wallet")
        .map_err(|_| "HMAC creation failed")?;
    mac.update(seed);
    let result = mac.finalize();
    let bytes = result.into_bytes();
    Ok(bytes[..32].to_vec())
}

/// Derive secp256k1 uncompressed public key (65 bytes: 0x04 + X + Y)
fn derive_public_key(private_key: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use k256::elliptic_curve::sec1::ToEncodedPoint;
    let secret_key = k256::SecretKey::from_slice(private_key)
        .map_err(|e| format!("Invalid private key: {}", e))?;
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    Ok(encoded.as_bytes().to_vec())
}

/// Convert secp256k1 public key to TRON address (Base58Check with 0x41 prefix)
pub fn public_key_to_address(public_key: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
    // public_key is 65 bytes: 0x04 || X (32 bytes) || Y (32 bytes)
    // Hash the 64 bytes after the 0x04 prefix
    let key_bytes = if public_key.len() == 65 && public_key[0] == 0x04 {
        &public_key[1..]
    } else {
        public_key
    };

    let mut hasher = Keccak256::new();
    hasher.update(key_bytes);
    let hash = hasher.finalize();

    // Take last 20 bytes of the hash
    let address_bytes = &hash[12..32];

    let mut tron_address = Vec::with_capacity(21);
    tron_address.push(0x41);
    tron_address.extend_from_slice(address_bytes);

    let address = base58check_encode(&tron_address);
    Ok(address)
}

pub fn base58check_encode(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash1 = hasher.finalize();

    let mut hasher = Sha256::new();
    hasher.update(hash1);
    let hash2 = hasher.finalize();

    let mut payload = data.to_vec();
    payload.extend_from_slice(&hash2[..4]);

    bs58::encode(payload).into_string()
}
