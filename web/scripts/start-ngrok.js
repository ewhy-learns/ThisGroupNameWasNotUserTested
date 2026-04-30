#!/usr/bin/env node
/* start-ngrok.js
   Simple script to start an ngrok tunnel programmatically using the ngrok npm package.
   Usage: node scripts/start-ngrok.js
   Optional: set NGROK_AUTH_TOKEN env var for authenticated tunnels.
*/
const ngrok = require('ngrok')

;(async () => {
  try {
    const port = process.env.PORT || 5173
    const opts = { addr: Number(port) }
    if (process.env.NGROK_AUTH_TOKEN) opts.authtoken = process.env.NGROK_AUTH_TOKEN
    const url = await ngrok.connect(opts)
    console.log('[start-ngrok] tunnel opened at', url)
    console.log('[start-ngrok] inspect at http://127.0.0.1:4040')
    // keep process alive until killed
    process.stdin.resume()
  } catch (err) {
    console.error('[start-ngrok] failed to start ngrok', err)
    process.exit(1)
  }
})()

