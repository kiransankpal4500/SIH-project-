/**
 * Local HTTP Runner for oceanscope-hycom-api Worker
 * Runs the compiled Cloudflare Worker on local port 8787 without needing external tools.
 */

import http from 'node:http';
import worker from './dist/index.js';

const PORT = process.env.PORT || 8787;
const HOST = '127.0.0.1';

const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const url = `http://${nodeReq.headers.host || `${HOST}:${PORT}`}${nodeReq.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(nodeReq.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const init = {
      method: nodeReq.method,
      headers,
    };

    if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of nodeReq) {
        chunks.push(chunk);
      }
      init.body = Buffer.concat(chunks);
    }

    const webReq = new Request(url, init);
    const webRes = await worker.fetch(webReq, {
      ENVIRONMENT: 'development',
      HYCOM_THREDDS_BASE: 'https://tds.hycom.org/thredds/dodsC',
      TIMEOUT_MS: 30000,
      MAX_RETRIES: 2,
    });

    nodeRes.statusCode = webRes.status;
    for (const [k, v] of webRes.headers.entries()) {
      nodeRes.setHeader(k, v);
    }

    const arrayBuffer = await webRes.arrayBuffer();
    nodeRes.end(Buffer.from(arrayBuffer));
  } catch (err) {
    nodeRes.statusCode = 500;
    nodeRes.setHeader('Content-Type', 'application/json');
    nodeRes.end(JSON.stringify({ detail: `Local server error: ${String(err)}` }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[LOCAL WORKER SERVER] Listening on http://${HOST}:${PORT}`);
});
