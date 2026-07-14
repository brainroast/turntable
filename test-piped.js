const instances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.drgns.space'
];

async function getAudioUrl(videoId) {
  for (const instance of instances) {
    try {
      console.log('Trying', instance);
      const url = `${instance}/streams/${videoId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const data = await res.json();
      const audioFormats = data.audioStreams;
      if (audioFormats && audioFormats.length > 0) {
        return audioFormats[0].url;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
  return null;
}

getAudioUrl('dQw4w9WgXcQ').then(url => console.log('Found URL:', url));
