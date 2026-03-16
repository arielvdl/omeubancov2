/**
 * postgres.js TransactionSql loses its tagged template call signature
 * due to TypeScript's Omit stripping call/construct signatures from interfaces.
 *
 * This is a known TypeScript limitation. We define a minimal callable interface
 * and provide a helper to cast TransactionSql at the boundary.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TxSql = any;
