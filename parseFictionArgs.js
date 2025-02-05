const regex = /(topic|author):/

export default function parseFictionArgs(input) {
  const args = input.split(/[ ,;]/).reduce((result, word) => {
    if (word.match(regex)) {
      const [, key] = word.match(regex)
      const [, value] = word.split(':')
      result[key] = value
      result.currentKey = key

    } else if (result.currentKey) {
      result[result.currentKey] += ` ${word}`
    }

    return result
  }, {})

  delete args.currentKey

  return args
}
