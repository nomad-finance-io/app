import {
  fixDecoderSize,
  getAddressDecoder,
  getBase64Encoder,
  getBooleanDecoder,
  getBytesDecoder,
  getI16Decoder,
  getI32Decoder,
  getI64Decoder,
  getStructDecoder,
  getU64Decoder,
  type Address,
  type ReadonlyUint8Array,
} from '@solana/kit';

const EVENT_LOG_PREFIX = 'Program data: ';

export const SWAP_EVENT_DISCRIMINATOR = new Uint8Array([
  64, 198, 205, 232, 38, 8, 113, 226,
]);

export const LP_CHANGE_EVENT_DISCRIMINATOR = new Uint8Array([
  121, 163, 205, 201, 57, 218, 117, 60,
]);

export interface SwapEvent {
  poolId: Address;
  inputVaultBefore: bigint;
  outputVaultBefore: bigint;
  inputAmount: bigint;
  outputAmount: bigint;
  inputTransferFee: bigint;
  outputTransferFee: bigint;
  baseInput: boolean;
  inputMint: Address;
  outputMint: Address;
  tradeFee: bigint;
  creatorFee: bigint;
  creatorFeeOnInput: boolean;
  oracleBid: bigint;
  oracleAsk: bigint;
  oracleExponent: number;
  oracleLastUpdateUnix: bigint;
  effectiveTradeFeeRate: bigint;
  inventoryImbalanceBps: number;
  inventorySkewBps: number;
}

const swapEventDecoder = getStructDecoder([
  ['poolId', getAddressDecoder()],
  ['inputVaultBefore', getU64Decoder()],
  ['outputVaultBefore', getU64Decoder()],
  ['inputAmount', getU64Decoder()],
  ['outputAmount', getU64Decoder()],
  ['inputTransferFee', getU64Decoder()],
  ['outputTransferFee', getU64Decoder()],
  ['baseInput', getBooleanDecoder()],
  ['inputMint', getAddressDecoder()],
  ['outputMint', getAddressDecoder()],
  ['tradeFee', getU64Decoder()],
  ['creatorFee', getU64Decoder()],
  ['creatorFeeOnInput', getBooleanDecoder()],
  ['oracleBid', getI64Decoder()],
  ['oracleAsk', getI64Decoder()],
  ['oracleExponent', getI16Decoder()],
  ['oracleLastUpdateUnix', getI64Decoder()],
  ['effectiveTradeFeeRate', getU64Decoder()],
  ['inventoryImbalanceBps', getI32Decoder()],
  ['inventorySkewBps', getI32Decoder()],
]);

const discriminatorDecoder = fixDecoderSize(getBytesDecoder(), 8);
const base64 = getBase64Encoder();

function bytesEqual(a: ReadonlyUint8Array, b: ReadonlyUint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function findSwapEvent(logs: readonly string[]): SwapEvent | null {
  for (const log of logs) {
    if (!log.startsWith(EVENT_LOG_PREFIX)) continue;
    const payload = log.slice(EVENT_LOG_PREFIX.length).trim();
    let bytes: ReadonlyUint8Array;
    try {
      bytes = base64.encode(payload);
    } catch {
      continue;
    }
    if (bytes.length < 8) continue;
    const discriminator = discriminatorDecoder.decode(bytes.slice(0, 8));
    if (!bytesEqual(discriminator, SWAP_EVENT_DISCRIMINATOR)) continue;
    return swapEventDecoder.decode(bytes.slice(8)) as SwapEvent;
  }
  return null;
}
