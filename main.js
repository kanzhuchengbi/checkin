const BASE_URL = process.env.RAILGUN_BASE_URL || 'https://railgun.info'
const COOKIE = process.env.RAILGUN || process.env.GLADOS
const CHECKIN_PATH = process.env.RAILGUN_CHECKIN_PATH || '/api/user/checkin'
const STATUS_PATH = process.env.RAILGUN_STATUS_PATH || '/api/user/status'
const CHECKIN_TOKEN = process.env.RAILGUN_TOKEN || 'railgun.info'

async function requestJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      accept: 'application/json, text/plain, */*',
      cookie: COOKIE,
      origin: BASE_URL,
      referer: `${BASE_URL}/console/checkin`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      ...(options.headers || {}),
    },
  })

  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`)
  }

  return data
}

async function railgun() {
  if (!COOKIE) {
    return ['Railgun Checkin Error', 'Missing cookie. Please set secret RAILGUN.']
  }

  try {
    const checkin = await requestJson(CHECKIN_PATH, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ token: CHECKIN_TOKEN }),
    })

    let statusText = ''
    try {
      const status = await requestJson(STATUS_PATH, { method: 'GET' })
      const leftDays =
        status?.data?.leftDays ??
        status?.data?.left_days ??
        status?.leftDays ??
        status?.left_days

      if (leftDays !== undefined) {
        statusText = `Left Days ${Number(leftDays)}`
      } else {
        statusText = `Status: ${JSON.stringify(status)}`
      }
    } catch (e) {
      statusText = `Status API failed: ${e.message}`
    }

    return [
      'Railgun Checkin OK',
      checkin?.message || checkin?.msg || JSON.stringify(checkin),
      statusText,
    ]
  } catch (error) {
    return [
      'Railgun Checkin Error',
      `${error}`,
      `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`,
    ]
  }
}

async function notify(contents) {
  const token = process.env.NOTIFY
  if (!token || !contents) {
    console.log(contents?.join('\n') || 'No output')
    return
  }

  await fetch('https://www.pushplus.plus/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      title: contents[0],
      content: contents.join('\n'),
      template: 'markdown',
    }),
  })
}

async function main() {
  const result = await railgun()
  console.log(result.join('\n'))
  await notify(result)
}

main()
