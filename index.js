const http = require('http');
const { Readable } = require('stream');
const colors = require('colors/safe');

const TEXT = '장병탁 교수님 만세';
const SCREEN_WIDTH = 80;
const SCREEN_HEIGHT = 24;

// Calculate display width (Korean chars = 2 columns, ASCII = 1)
function displayWidth(str) {
  let width = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3040 && code <= 0x33BF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0x20000 && code <= 0x2FA1F)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

const textDisplayWidth = displayWidth(TEXT);
const padding = 2;
const innerWidth = padding + textDisplayWidth + padding;
const boxDisplayWidth = 1 + innerWidth + 1;

const boxLines = [
  '\u2554' + '\u2550'.repeat(innerWidth) + '\u2557',
  '\u2551' + ' '.repeat(padding) + TEXT + ' '.repeat(padding) + '\u2551',
  '\u255A' + '\u2550'.repeat(innerWidth) + '\u255D',
];
const boxHeight = boxLines.length;

const colorsOptions = ['red', 'yellow', 'green', 'blue', 'magenta', 'cyan', 'white'];
const numColors = colorsOptions.length;

function streamer(stream) {
  let x = Math.floor(Math.random() * (SCREEN_WIDTH - boxDisplayWidth));
  let y = Math.floor(Math.random() * (SCREEN_HEIGHT - boxHeight));
  let dx = Math.random() > 0.5 ? 1 : -1;
  let dy = Math.random() > 0.5 ? 1 : -1;
  let colorIdx = Math.floor(Math.random() * numColors);
  let timer;

  function tick() {
    let frame = '';
    for (let row = 0; row < SCREEN_HEIGHT; row++) {
      if (row >= y && row < y + boxHeight) {
        frame += ' '.repeat(x) + boxLines[row - y];
      }
      frame += '\n';
    }

    stream.push('\u001b[2J\u001b[3J\u001b[H');
    const coloredFrame = colors[colorsOptions[colorIdx]](frame);
    const ok = stream.push(coloredFrame);

    // Update position
    x += dx;
    y += dy;

    // Bounce off walls and change color
    if (x <= 0 || x >= SCREEN_WIDTH - boxDisplayWidth) {
      dx = -dx;
      colorIdx = (colorIdx + 1) % numColors;
    }
    if (y <= 0 || y >= SCREEN_HEIGHT - boxHeight) {
      dy = -dy;
      colorIdx = (colorIdx + 1) % numColors;
    }

    if (ok) {
      timer = setTimeout(tick, 100);
    } else {
      stream.once('drain', () => {
        timer = setTimeout(tick, 100);
      });
    }
  }

  tick();
  return () => clearTimeout(timer);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (
    req.headers &&
    req.headers['user-agent'] &&
    !req.headers['user-agent'].includes('curl')
  ) {
    res.writeHead(302, { Location: 'https://github.com/hugomd/parrot.live' });
    return res.end();
  }

  const stream = new Readable({ read() {} });
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  stream.pipe(res);

  const cleanupLoop = streamer(stream);

  const onClose = () => {
    cleanupLoop();
    stream.destroy();
  };
  res.on('close', onClose);
  res.on('error', onClose);
});

const port = process.env.PORT || 3000;
server.listen(port, err => {
  if (err) throw err;
  console.log(`Listening on http://localhost:${port}`);
});
