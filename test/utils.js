import { describe, it } from 'mocha'
import { expect } from 'chai'

import { cmd, niceDate, removeIndentation, isLink, getInt } from '../src/utils'

describe('cmd', () => {
  it('runs a command', async () => {
    const result = await cmd('node --version')
    expect(result).to.be.a('string')
  })
})

describe('niceDate', () => {
  it('formats string into nice date', () => {
    expect(niceDate('2015-10-03')).to.equal('3 October 2015')
    expect(niceDate('2017-11-07T19:19:02.635Z')).to.equal('7 November 2017')
  })

  it('formats date into nice date', () => {
    expect(niceDate(new Date(2016, 8, 2))).to.equal('2 September 2016')
    expect(niceDate(new Date('2015-10-03'))).to.equal('3 October 2015')
  })
})

describe('removeIndentation', () => {
  it('removes indentation', () => {
    const input = '  some\n    indented\n       text'
    const expected = 'some\nindented\ntext'
    expect(removeIndentation(input)).to.equal(expected)
  })
})

describe('isLink', () => {
  it('returns true for links', () => {
    expect(isLink('http://test.com')).to.equal(true)
  })

  it('returns false for non-links', () => {
    expect(isLink('not a link')).to.equal(false)
  })
})

describe('getInt', () => {
  it('returns correct integer when recieving a string or number', () => {
    expect(getInt(5)).to.equal(5)
    expect(getInt('-5')).to.equal(-5)
    expect(getInt('5.0')).to.equal(5)
    expect(getInt('3.7')).to.equal(3) // parseInt will floor a float value.
  })

  it('returns fallback when recieving something odd', () => {
    expect(getInt('', 1)).to.equal(1)
    expect(getInt('test', 1)).to.equal(1)
    expect(getInt(NaN, 5)).to.equal(5)
    expect(getInt(undefined, 9)).to.equal(9)
    expect(getInt(null)).to.equal(0) // 0 is default
  })
})
