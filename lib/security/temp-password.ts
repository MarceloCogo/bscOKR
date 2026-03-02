const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ'
const NUMBERS = '23456789'
const SYMBOLS = '!@#$%&*?'

function randomChar(chars: string) {
  const index = Math.floor(Math.random() * chars.length)
  return chars[index]
}

function shuffle(input: string) {
  const chars = input.split('')
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join('')
}

export function generateTemporaryPassword(length = 14) {
  const minLength = Math.max(length, 10)
  const all = `${LOWER}${UPPER}${NUMBERS}${SYMBOLS}`

  let password = ''
  password += randomChar(LOWER)
  password += randomChar(UPPER)
  password += randomChar(NUMBERS)
  password += randomChar(SYMBOLS)

  while (password.length < minLength) {
    password += randomChar(all)
  }

  return shuffle(password)
}
