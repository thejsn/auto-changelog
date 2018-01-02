import { cmd, isLink, getInt } from './utils'

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'
const LOG_FORMAT = COMMIT_SEPARATOR + '%H%n%D%n%aI%n%an%n%ae%n%B' + MESSAGE_SEPARATOR
const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/
const TAG_PREFIX = 'tag: '
const VERSION_PATTERN = /v(\d+)\.(\d+)\.(\d+)/

// https://help.github.com/articles/closing-issues-via-commit-messages
const DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi

const MERGE_PATTERNS = [
  /Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
  /^(.+) \(#(\d+)\)(?:$|\n\n)/, // Github squash merge
  /Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
  /Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request !(\d+)/ // GitLab merge
]

export async function fetchCommits (origin, options) {
  const log = await cmd(`git log --shortstat --pretty=format:${LOG_FORMAT}`)
  return parseCommits(log, origin, options)
}

function parseCommits (string, origin, options = {}) {
  const commits = string
    .split(COMMIT_SEPARATOR)
    .slice(1)
    .map(commit => parseCommit(commit, origin, options))

  if (options.startingCommit) {
    const index = commits.findIndex(c => c.hash.indexOf(options.startingCommit) === 0)
    if (index === -1) {
      throw new Error(`Starting commit ${options.startingCommit} was not found`)
    }
    return commits.slice(0, index + 1)
  }

  return commits
}

function parseCommit (commit, origin, options = {}) {
  const [, hash, refs, date, author, email, tail] = commit.match(MATCH_COMMIT)
  const [message, stats] = tail.split(MESSAGE_SEPARATOR)
  return {
    hash,
    shorthash: hash.slice(0, 7),
    author,
    email,
    date,
    tag: getTag(refs, options),
    subject: getSubject(message),
    message: message.trim(),
    fixes: getFixes(message, origin, options),
    merge: getMerge(message, origin),
    href: getCommitLink(hash, origin),
    ...getStats(stats.trim())
  }
}

function getTag (refs, options = {}) {
  if (!refs) return null
  for (let ref of refs.split(', ')) {
    if (ref.indexOf(TAG_PREFIX) === 0) {
      let pattern = VERSION_PATTERN
      // take version pattern from options
      if (typeof options.versionPattern !== 'undefined') {
        pattern = new RegExp(options.versionPattern)
      }

      const parts = ref.match(pattern)
      if (parts === null) {
        return null
      }

      return 'v' +
              getInt(parts[1], 0) + '.' +
              getInt(parts[2], 0) + '.' +
              getInt(parts[3], 0)
    }
  }
  return null
}

function getSubject (message) {
  return message.match(/[^\n]+/)[0]
}

function getStats (stats) {
  if (!stats) return {}
  const [, files, insertions, deletions] = stats.match(MATCH_STATS)
  return {
    files: getInt(files, 0),
    insertions: getInt(insertions, 0),
    deletions: getInt(deletions, 0)
  }
}

function getFixes (message, origin, options = {}) {
  const pattern = getFixPattern(options)
  let fixes = []
  let match = pattern.exec(message)
  if (!match) return null
  while (match) {
    const id = getFixID(match)
    const href = getIssueLink(match, id, origin, options.issueUrl)
    fixes.push({ id, href })
    match = pattern.exec(message)
  }
  return fixes
}

function getFixID (match) {
  // Get the last non-falsey value in the match array
  for (let i = match.length; i >= 0; i--) {
    if (match[i]) {
      return match[i]
    }
  }
}

function getFixPattern (options) {
  if (options.issuePattern) {
    return new RegExp(options.issuePattern, 'g')
  }
  return DEFAULT_FIX_PATTERN
}

function getMerge (message, origin, mergeUrl) {
  for (let pattern of MERGE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      const id = /^\d+$/.test(match[1]) ? match[1] : match[2]
      const message = /^\d+$/.test(match[1]) ? match[2] : match[1]
      return {
        id,
        message,
        href: getMergeLink(id, origin, mergeUrl)
      }
    }
  }
  return null
}

function getCommitLink (hash, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.url}/commits/${hash}`
  }
  return `${origin.url}/commit/${hash}`
}

function getIssueLink (match, id, origin, issueUrl) {
  if (isLink(match[2])) {
    return match[2]
  }
  if (issueUrl) {
    return issueUrl.replace('{id}', id)
  }
  return `${origin.url}/issues/${id}`
}

function getMergeLink (id, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.url}/pull-requests/${id}`
  }
  if (origin.hostname === 'gitlab.com') {
    return `${origin.url}/merge_requests/${id}`
  }
  return `${origin.url}/pull/${id}`
}
