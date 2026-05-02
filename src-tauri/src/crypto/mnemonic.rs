use bip39::Mnemonic;
use rand::RngCore;
use zeroize::Zeroize;

pub struct MnemonicGenerator;

impl MnemonicGenerator {
    pub fn generate(word_count: usize) -> Result<String, Box<dyn std::error::Error>> {
        let entropy_bits = match word_count {
            12 => 128,
            15 => 160,
            18 => 192,
            21 => 224,
            24 => 256,
            _ => return Err("Invalid word count. Use 12, 15, 18, 21, or 24".into()),
        };

        let mut entropy = vec![0u8; entropy_bits / 8];
        rand::thread_rng().fill_bytes(&mut entropy);

        let mnemonic = Mnemonic::from_entropy(&entropy)
            .map_err(|e| format!("Failed to generate mnemonic: {}", e))?;
        Ok(mnemonic.to_string())
    }

    pub fn validate(phrase: &str) -> bool {
        Mnemonic::parse(phrase).is_ok()
    }

    pub fn to_seed(phrase: &str, passphrase: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mnemonic = Mnemonic::parse(phrase)
            .map_err(|e| format!("Invalid mnemonic: {}", e))?;

        let seed = mnemonic.to_seed(passphrase);
        Ok(seed.to_vec())
    }
}

pub struct SecureMnemonic {
    phrase: String,
}

impl SecureMnemonic {
    pub fn new(phrase: String) -> Self {
        Self { phrase }
    }

    pub fn as_str(&self) -> &str {
        &self.phrase
    }
}

impl Drop for SecureMnemonic {
    fn drop(&mut self) {
        self.phrase.zeroize();
    }
}
