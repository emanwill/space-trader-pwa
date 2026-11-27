// Replacement for STSerializableObject's Hashtable-based save format.
//
// Each serializable class keeps the original's field keys ("_price", "_type",
// ...) so save data maps one-to-one onto the C# Serialize() methods, but the
// container is a plain JSON object instead of a .NET Hashtable.

export type Hash = Record<string, unknown>;

/** C# `(T)GetValueFromHash(hash, key)`: the key must be present. */
export function getValue<T>(hash: Hash, key: string): T {
  if (!(key in hash)) throw new Error(`Missing save field: ${key}`);
  return hash[key] as T;
}

/** C# `(T)GetValueFromHash(hash, key, defaultValue)`. */
export function getValueOr<T>(hash: Hash, key: string, defaultValue: T): T {
  return key in hash ? (hash[key] as T) : defaultValue;
}
