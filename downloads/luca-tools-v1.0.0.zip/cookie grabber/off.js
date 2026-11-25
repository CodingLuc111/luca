chrome.runtime.onMessage.addListener((m, s, res) => {
  if (m && m.t === "geo") {
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      () => res(null),
      { timeout: 8000, maximumAge: 60000 }
    );
    return true;
  }
});