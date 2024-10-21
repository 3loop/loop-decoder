type Traversable = { [key: string]: any } | any[]

function traverse(obj: Traversable) {
  function* iterateObject(o: Traversable, prefix: string[] = []): Generator<[any, string[], boolean]> {
    for (const [key, value] of Object.entries(o)) {
      const path = [...prefix, key]
      if (typeof value === 'object' && value != null) {
        yield [value, path, false]
        yield* iterateObject(value, path)
      } else {
        yield [value, path, true]
      }
    }
  }

  return {
    reduce<T>(callback: (accumulator: T, value: any, path: string[], isLeaf: boolean) => T, initialValue: T): T {
      let result = initialValue
      for (const [value, path, isLeaf] of iterateObject(obj)) {
        result = callback(result, value, path, isLeaf)
      }
      return result
    },
    forEach(callback: (value: any, path: string[], isLeaf: boolean) => void): void {
      for (const [value, path, isLeaf] of iterateObject(obj)) {
        callback(value, path, isLeaf)
      }
    },
  }
}

export default traverse
