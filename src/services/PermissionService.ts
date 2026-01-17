import { Context, Effect, Layer } from "effect";
import type { PermissionConfig, PermissionAction } from "../types.js";
import { PermissionDeniedError } from "../types.js";
import { Wildcard } from "../utils/wildcard.js";
import * as path from "node:path";

/**
 * Permission service for checking command and directory permissions
 */
export class PermissionService extends Context.Tag("PermissionService")<
  PermissionService,
  {
    checkCommand: (command: string, args: string[]) => Effect.Effect<boolean, PermissionDeniedError>;
    checkWorkdir: (workdir: string, projectDir: string) => Effect.Effect<boolean, PermissionDeniedError>;
  }
>() {}

/**
 * Load permission configuration from environment variable
 */
const loadPermissionConfig = Effect.sync((): PermissionConfig => {
  const envConfig = process.env.PTY_PERMISSIONS;
  if (!envConfig) {
    return { bash: "allow" };
  }
  try {
    return JSON.parse(envConfig) as PermissionConfig;
  } catch {
    console.warn("Failed to parse PTY_PERMISSIONS, using default (allow all)");
    return { bash: "allow" };
  }
});

/**
 * Get permission action for a command
 */
const getPermissionAction = (
  command: string,
  args: string[],
  config: PermissionConfig
): Effect.Effect<PermissionAction> => 
  Effect.sync(() => {
    const bashPerms = config.bash;
    
    if (!bashPerms) {
      return "allow";
    }
    
    // If it's a string, it's a global permission
    if (typeof bashPerms === "string") {
      return bashPerms;
    }
    
    // If it's an object, use wildcard matching
    const action = Wildcard.allStructured(
      { head: command, tail: args },
      bashPerms
    );
    
    return (action as PermissionAction) ?? "allow";
  });

/**
 * Normalize path (remove trailing slashes)
 */
const normalizePath = (p: string): string => {
  return path.resolve(p);
};

/**
 * Default implementation of PermissionService
 */
export const PermissionServiceLive = Layer.effect(
  PermissionService,
  Effect.gen(function* () {
    const config = yield* loadPermissionConfig;
    
    return {
      checkCommand: (command: string, args: string[]) =>
        Effect.gen(function* () {
          const action = yield* getPermissionAction(command, args, config);
          
          if (action === "deny") {
            return yield* Effect.fail(
              new PermissionDeniedError({
                command: `${command} ${args.join(" ")}`.trim(),
                reason: "Command is denied by configuration"
              })
            );
          }
          
          if (action === "ask") {
            // MCP doesn't support interactive prompts, treat as deny
            return yield* Effect.fail(
              new PermissionDeniedError({
                command: `${command} ${args.join(" ")}`.trim(),
                reason: "Command requires approval (ask mode not supported in MCP)"
              })
            );
          }
          
          return true;
        }),
      
      checkWorkdir: (workdir: string, projectDir: string) =>
        Effect.gen(function* () {
          const normalized = normalizePath(workdir);
          const normalizedProject = normalizePath(projectDir);
          
          if (!normalized.startsWith(normalizedProject)) {
            const action = config.external_directory ?? "allow";
            
            if (action === "deny") {
              return yield* Effect.fail(
                new PermissionDeniedError({
                  command: workdir,
                  reason: "External directory access is denied"
                })
              );
            }
            
            // Log warning for "ask" mode since we can't prompt
            if (action === "ask") {
              console.warn(
                `[PTY Permission] External directory access to ${workdir} (ask mode treated as allow in MCP)`
              );
            }
          }
          
          return true;
        })
    };
  })
);
