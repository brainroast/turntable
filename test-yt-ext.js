import yt from 'youtube-ext';

async function test() {
  try {
    const info = await yt.videoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const formats = await yt.getFormats('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log(formats.map(f => f.url).slice(0, 1));
  } catch (e) {
    console.error(e);
  }
}

test();
