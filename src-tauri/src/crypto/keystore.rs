use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, Algorithm, Version, Params};
use rand::RngCore;
use zeroize::Zeroize;

const PASSWORD_HASH_SALT_SIZE: usize = 32;
const VERIFICATION_HASH_SIZE: usize = 32;

pub struct Keystore {
    pub encrypted_data: Vec<u8>,
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
    pub tag: Vec<u8>,
}

impl Keystore {
    pub fn encrypt(data: &[u8], password: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);

        let key = derive_key(password, &salt)?;

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| "Failed to create cipher")?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, data)
            .map_err(|_| "Encryption failed")?;

        let (encrypted, tag) = ciphertext.split_at(ciphertext.len() - 16);

        Ok(Keystore {
            encrypted_data: encrypted.to_vec(),
            salt: salt.to_vec(),
            nonce: nonce_bytes.to_vec(),
            tag: tag.to_vec(),
        })
    }

    pub fn decrypt(keystore: &Keystore, password: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let key = derive_key(password, &keystore.salt)?;

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|_| "Failed to create cipher")?;
        let nonce = Nonce::from_slice(&keystore.nonce);

        let mut ciphertext = keystore.encrypted_data.clone();
        ciphertext.extend_from_slice(&keystore.tag);

        let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| "Decryption failed - wrong password?")?;

        Ok(plaintext)
    }
}

pub fn hash_password_for_verification(password: &str) -> Result<String, Box<dyn std::error::Error>> {
    let mut salt = [0u8; PASSWORD_HASH_SALT_SIZE];
    rand::thread_rng().fill_bytes(&mut salt);

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());
    let mut hash = [0u8; VERIFICATION_HASH_SIZE];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut hash)
        .map_err(|_| "Password hashing failed")?;

    Ok(format!("{}:{}", hex::encode(salt), hex::encode(hash)))
}

pub fn verify_password_hash(password: &str, encoded: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let mut parts = encoded.split(':');
    let salt_hex = parts.next().ok_or("Invalid password hash format")?;
    let hash_hex = parts.next().ok_or("Invalid password hash format")?;
    if parts.next().is_some() {
        return Err("Invalid password hash format".into());
    }

    let salt = hex::decode(salt_hex).map_err(|_| "Invalid password hash salt")?;
    let expected_hash = hex::decode(hash_hex).map_err(|_| "Invalid password hash value")?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());
    let mut actual_hash = vec![0u8; expected_hash.len()];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut actual_hash)
        .map_err(|_| "Password verification failed")?;

    Ok(actual_hash == expected_hash)
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], Box<dyn std::error::Error>> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| "Key derivation failed")?;
    Ok(key)
}

impl Drop for Keystore {
    fn drop(&mut self) {
        self.encrypted_data.zeroize();
        self.salt.zeroize();
        self.nonce.zeroize();
        self.tag.zeroize();
    }
}
