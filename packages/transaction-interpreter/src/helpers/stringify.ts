function replacer(_: unknown, value: unknown) {
  if (typeof value === 'bigint') {
    return {
      type: 'bigint',
      value: value.toString(),
    }
  } else {
    return value
  }
}

export function stringify(object: unknown, indentation?: number): string {
  return JSON.stringify(object, replacer, indentation)
}
