export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  wallet_type: "single" | "multisig" | "watch";
  network: string;
  created_at: string;
}

export interface CreateWalletRequest {
  name: string;
  password: string;
  wallet_type: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  tx_hash: string;
  block_number: number | null;
  from_address: string;
  to_address: string;
  amount: string;
  token_address: string | null;
  token_symbol: string | null;
  fee: string | null;
  energy_used: number | null;
  bandwidth_used: number | null;
  memo: string | null;
  status: "pending" | "confirmed" | "failed";
  direction: "in" | "out" | "self";
  timestamp: string;
}

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  network: string;
  group: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  last_used_at: string | null;
}
