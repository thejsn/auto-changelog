import { spawn } from 'child_process'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Simple util for calling a child process
export function cmd (string) {
  const [ cmd, ...args ] = string.split(' ')
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let data = ''

    child.stdout.on('data', buffer => { data += buffer.toString() })
    child.stdout.on('end', () => resolve(data))
    child.on('error', reject)
  })
}

/**
 * Make sure something is an integer, with a fallback.
 * Helper to increase test coverage.
 * @param {*} something
 * @param {Integer} fallback
 */
export function getInt (something, fallback = 0) {
  return parseInt(something) || fallback
}

export function niceDate (string) {
  const date = new Date(string)
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function removeIndentation (string) {
  return string
    .replace(/\n +/g, '\n')
    .replace(/^ +/, '')
}

export function isLink (string) {
  return /^http/.test(string)
}

export function parseLimit (limit) {
  return limit === 'false' ? false : parseInt(limit, 10)
}
