#!/usr/bin/env node
/* start-ngrok.cjs - CommonJS entry so it works when package.json has "type": "module" */
const ngrok = require('ngrok')

;(async () => {
  try {
    const port = process.env.PORT || 5173
    const opts = { addr: Number(port) }
    if (process.env.NGROK_AUTH_TOKEN) opts.authtoken = process.env.NGROK_AUTH_TOKEN
    const url = await ngrok.connect(opts)
    console.log('[start-ngrok] tunnel opened at', url)
    console.log('[start-ngrok] inspect at http://127.0.0.1:4040')
    process.stdin.resume()
  } catch (err) {
    console.error('[start-ngrok] failed to start ngrok', err)
    process.exit(1)
  }
})()

