const instances = [
  'https://invidious.jing.rocks',
  'https://invidious.nerdvpn.de',
  'https://invidious.protokolla.fi',
  'https://invidious.slipfox.xyz',
  'https://inv.tux.pizza',
  'https://invidious.poast.org',
  'https://invidious.fdn.fr'
];

async function getAudioUrl(videoId) {
  for (const instance of instances) {
    try {
      console.log('Trying', instance);
      const url = `${instance}/api/v1/videos/${videoId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const data = await res.json();
      const audioFormats = data.adaptiveFormats.filter(f => f.type.startsWith('audio/'));
      if (audioFormats.length > 0) {
        return audioFormats[0].url;
      }
    } catch (e) {
      console.error(e.message);
    }
  }
  return null;
}

getAudioUrl('dQw4w9WgXcQ').then(url => console.log('Found URL:', url));
