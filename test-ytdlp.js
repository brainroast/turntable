const { spawn } = require('child_process');
const ytDlp = spawn('./yt-dlp', ['-f', 'bestaudio', '-o', '-', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
let byteCount = 0;
ytDlp.stdout.on('data', (d) => { byteCount += d.length; });
ytDlp.on('close', (code) => { console.log('Done, bytes:', byteCount, 'code:', code); });
