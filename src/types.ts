import { Data } from "effect";
import type { IPty } from "node-pty";
import type { RingBuffer } from "./services/RingBuffer.js";

// ============================================================================
// Status Types
// ============================================================================

export type PTYStatus = "running" | "idle" | "exited" | "killed";

// ============================================================================
// Session Types
// ============================================================================

/**
 * Internal PTY session representation with full state
 */
export interface PTYSession {
  id: string;
  title: string;
  description: string | undefined;
  command: string;
  args: string[];
  workdir: string;
  env: Record<string, string> | undefined;
  status: PTYStatus;
  exitCode: number | undefined;
  pid: number;
  createdAt: Date;
  notifyOnExit: boolean;
  buffer: RingBuffer;
  process: IPty;
}

/**
 * Public PTY session info exposed to tools (without process and buffer)
 */
export interface PTYSessionInfo {
  id: string;
  title: string;
  command: string;
  args: string[];
  workdir: string;
  status: PTYStatus;
  exitCode: number | undefined;
  pid: number;
  createdAt: Date;
  lineCount: number;
}

/**
 * Options for spawning a new PTY session
 */
export interface SpawnOptions {
  command: string;
  args: string[] | undefined;
  workdir: string | undefined;
  env: Record<string, string> | undefined;
  title: string | undefined;
  description: string | undefined;
  notifyOnExit: boolean | undefined;
}

// ============================================================================
// Buffer Result Types
// ============================================================================

/**
 * Result from reading PTY buffer (standard mode)
 */
export interface ReadResult {
  lines: string[];
  totalLines: number;
  offset: number;
  hasMore: boolean;
  status: PTYStatus;
}

/**
 * A single match from buffer search
 */
export interface SearchMatch {
  lineNumber: number; // 1-based line number
  text: string;
}

/**
 * Result from searching PTY buffer (regex mode)
 */
export interface SearchResult {
  matches: SearchMatch[];
  totalMatches: number;
  totalLines: number;
  offset: number;
  hasMore: boolean;
  status: PTYStatus;
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionAction = "allow" | "ask" | "deny";

export interface PermissionConfig {
  bash?: Record<string, PermissionAction> | PermissionAction;
  external_directory?: PermissionAction;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * PTY session not found error
 */
export class PTYNotFoundError extends Data.TaggedError("PTYNotFoundError")<{
  id: string;
}> {}

/**
 * PTY is not in running state
 */
export class PTYNotRunningError extends Data.TaggedError("PTYNotRunningError")<{
  id: string;
  status: PTYStatus;
}> {}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Data.TaggedError("PermissionDeniedError")<{
  command: string;
  reason: string;
}> {}

/**
 * Command execution error
 */
export class CommandExecutionError extends Data.TaggedError("CommandExecutionError")<{
  command: string;
  message: string;
}> {}

/**
 * Invalid regex pattern error
 */
export class InvalidRegexError extends Data.TaggedError("InvalidRegexError")<{
  pattern: string;
  message: string;
}> {}
