import fs from "fs";
import pngToIco from "png-to-ico";

pngToIco("resources/icon.png")
  .then((buf) => {
    fs.writeFileSync("build/icon.ico", buf);
    console.log("Ico done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
