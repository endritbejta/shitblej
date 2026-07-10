const NodeGeocoder = require("node-geocoder");
const config = require("../config");

const options = {
  provider: config.geocoder.provider,
  httpAdapter: "https",
  apiKey: config.geocoder.apiKey,
  formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;
