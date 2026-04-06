const { app, net } = require("electron");
const fs = require("fs");

app.whenReady().then(async () => {
  const url =
    "https://steamcommunity.com/profiles/76561199050848477/games?tab=all";
  const response = await net.fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Cookie: "birthtime=568022401; lastagecheckage=1-January-1988",
    },
  });
  console.log("Status: " + response.status + " Url: " + response.url);
  const html = await response.text();
  fs.writeFileSync("steam_debug.html", html);
  app.quit();
});
