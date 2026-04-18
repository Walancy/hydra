import axios from "axios";

async function testSearch(title) {
  try {
    const titleCleaned = title.replace(/[™®©]/g, "").trim();
    console.log(`Searching for: ${titleCleaned}`);
    const res = await axios.get(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(titleCleaned)}&l=english&cc=US`
    );
    const data = res.data;
    if (data && data.items && data.items.length > 0) {
      const steamAppId = data.items[0].id;
      const gameName = data.items[0].name;
      console.log(`Found: ${gameName} (AppID: ${steamAppId})`);
      console.log(
        `- Icon: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`
      );
    } else {
      console.log(`No results found for ${title}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await testSearch("Marvel's Spider-Man Remastered");
  await testSearch("Remnant™: From the Ashes");
  await testSearch("Grand Theft Auto V");
  await testSearch("Control");
  await testSearch("Prey");
}

run();
