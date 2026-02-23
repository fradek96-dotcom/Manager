import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PORT = 5173;
const ROOT = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const clients = new Set();

watch(ROOT, { recursive: true }, (_, filename) => {
  if (!filename || filename.startsWith('.git') || filename.includes('node_modules')) {
    return;
  }

  for (const client of clients) {
    client.write('data: reload\\n\\n');
  }
});

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (req.url === '/__live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    res.write('retry: 250\\n\\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });

    return;
  }

  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = normalize(requestPath).replace(/^\/+/, '');
  const filePath = join(ROOT, safePath);

  try {
    const file = await readFile(filePath, 'utf8');

    if (extname(filePath) === '.html') {
      const injected = file.replace(
        '</body>',
        `<script>
          const source = new EventSource('/__live');
          source.onmessage = (event) => {
            if (event.data === 'reload') window.location.reload();
          };
        </script></body>`
      );

      res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
      res.end(injected);
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'text/plain; charset=utf-8' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Manager dev server running at http://localhost:${PORT}`);
});
