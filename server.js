const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const PORT = process.env.PORT || 7000;

serveHTTP(addonInterface, { port: PORT })
  .then(({ url }) => {
    console.log("Addon active on:", url);
    console.log("To install in Stremio, use:", url);
  })
  .catch((error) => {
    console.error("Failed to start addon:", error);
  });
