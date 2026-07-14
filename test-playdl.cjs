const play = require('play-dl');

async function getStream() {
  try {
    const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log(stream);
  } catch (e) {
    console.error(e);
  }
}

getStream();
