export const CHAIN_NAMES: Record<number, string> = {
  31337: 'Local',
  84532: 'Base Sepolia',
  8453: 'Base',
  1: 'Ethereum',
  11155111: 'Sepolia',
};

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

/**
 * Block explorer base URLs keyed by chain ID.
 * Each URL ends with `/token/` so you can append a contract address directly.
 */
export const EXPLORER_TOKEN_URLS: Record<number, string> = {
  8453: 'https://basescan.org/token/',
  84532: 'https://sepolia.basescan.org/token/',
  1: 'https://etherscan.io/token/',
  11155111: 'https://sepolia.etherscan.io/token/',
};

/**
 * Returns the block-explorer token URL for a given chain ID, or `undefined`
 * if the chain is not supported.
 */
export function getExplorerTokenUrl(chainId: number): string | undefined {
  return EXPLORER_TOKEN_URLS[chainId];
}
