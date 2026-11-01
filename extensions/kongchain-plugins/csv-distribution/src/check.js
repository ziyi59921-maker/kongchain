/**
 * Authorized-file layer for csv_distribution.
 *
 * Resolves the requested path inside the workspace root, rejects anything that
 * escapes it, hashes the bytes, and hands the text to the pure distribution
 * module. Read-only: no write, move, or delete path exists here.
 *
 * @module csv-distribution/check
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { computeDistribution, CsvInputError, PathAuthorizationError, isInsideRoot } from './stats.js'

/** Plugin directory: extensions/kongchain-plugins/csv-distribution. */
export const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
/** Authorized workspace root: the checkout that contains this plugin. */
export const WORKSPACE_ROOT = resolve(PLUGIN_ROOT, '..', '..', '..')
/** Largest CSV accepted; larger files are rejected instead of truncated. */
export const MAX_BYTES = 64 * 1024 * 1024

/**
 * Resolve a path, following links when the target exists.
 * @param {string} path Absolute path.
 * @returns {string} Real path when readable, otherwise the resolved path.
 */
function realOrResolved(path) {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

const REAL_WORKSPACE_ROOT = realOrResolved(WORKSPACE_ROOT)

/**
 * Turn the requested path into a readable CSV inside the workspace.
 * @param {unknown} input Caller-supplied path.
 * @returns {{ path: string, bytes: number }} Verified absolute path and size.
 * @throws {PathAuthorizationError} When the path is empty or resolves outside the workspace.
 * @throws {CsvInputError} When the file is missing, not a regular file, not `.csv`, or too large.
 */
export function resolveAuthorizedCsv(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new CsvInputError('path must be a non-empty string pointing at a .csv file inside the workspace')
  }

  const requested = input.trim()
  const realTarget = realOrResolved(resolve(REAL_WORKSPACE_ROOT, requested))

  if (!isInsideRoot(realTarget, REAL_WORKSPACE_ROOT)) {
    throw new PathAuthorizationError(
      `path outside authorized workspace: ${requested} (authorized root: ${REAL_WORKSPACE_ROOT})`,
    )
  }
  if (!existsSync(realTarget)) throw new CsvInputError(`file not found: ${requested}`)
  if (!statSync(realTarget).isFile()) throw new CsvInputError(`not a regular file: ${requested}`)
  if (extname(realTarget).toLowerCase() !== '.csv') {
    throw new CsvInputError(`unsupported file type "${extname(realTarget)}"; csv_distribution reads .csv files only`)
  }

  const { size } = statSync(realTarget)
  if (size > MAX_BYTES) {
    throw new CsvInputError(`file is ${size} bytes, above the ${MAX_BYTES}-byte limit; split it before analysis`)
  }
  return { path: realTarget, bytes: size }
}

/**
 * Read and analyze one authorized CSV column.
 * @param {{ path?: unknown, column?: unknown, bins?: unknown }} [args] Tool arguments.
 * @returns {string} JSON text with source metadata, distribution statistics, and limitations.
 * @throws {PathAuthorizationError | CsvInputError} When the path, file, column, or bins are unusable.
 */
export function analyzeCsv(args = {}) {
  const { path, bytes } = resolveAuthorizedCsv(args.path)
  const buffer = readFileSync(path)
  if (buffer.includes(0)) throw new CsvInputError(`file contains NUL bytes and is not a text CSV: ${path}`)

  const sha256 = createHash('sha256').update(buffer).digest('hex')
  const text = buffer.toString('utf8')

  return JSON.stringify(
    computeDistribution({
      text,
      path,
      sha256,
      bytes,
      column: args.column,
      bins: args.bins,
    }),
    undefined,
    2,
  )
}
