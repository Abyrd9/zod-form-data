export type DeepPartial<T> = 
  // Handle arrays specially - make the array itself nullable, and its elements partial
  T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    // Handle Maps
    : T extends Map<infer K, infer V>
    ? Map<K, DeepPartial<V>>
    // Handle Sets
    : T extends Set<infer U>
    ? Set<DeepPartial<U>>
    // Handle functions - don't try to make them partial
    : T extends (...args: any[]) => any
    ? T
    // Handle dates and other primitives wrapped as objects
    : T extends Date | RegExp
    ? T
    // Handle regular objects - make properties optional and nullable
    : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> | null }
    // Primitives stay as-is
    : T;
