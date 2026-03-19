import Station from "@terra-money/station-connector"

// legacy terra webapps
window.isTerraExtensionAvailable = true
// new inetchain webapps
window.isStationExtensionAvailable = true

// ---------------------------------------------
// for multiple extension support
// ---------------------------------------------
const STATION_INFO = {
  name: "Terra Classic Station Wallet",
  identifier: "terra-classic-station",
  icon: "https://station-assets.terraclassic.community/img/station.png",
}

if (
  typeof window.terraWallets !== "undefined" &&
  Array.isArray(window.terraWallets)
) {
  window.terraWallets.push(STATION_INFO)
} else {
  window.terraWallets = [STATION_INFO]
}

if (
  typeof window.interchainWallets !== "undefined" &&
  Array.isArray(window.interchainWallets)
) {
  window.interchainWallets.push(STATION_INFO)
} else {
  window.interchainWallets = [STATION_INFO]
}

window.terraClassicStation = new Station()

