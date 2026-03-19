import Station from "@terra-money/station-connector"

function injectKeplr() {
  window.terraClassicStation = new Station()

  window.getOfflineSigner = window.terraClassicStation.getOfflineSigner

  window.getOfflineSignerOnlyAmino = window.terraClassicStation.getOfflineSigner

  window.getOfflineSignerAuto = async (chainID) =>
    window.terraClassicStation.getOfflineSigner(chainID)

  window.keplr = window.terraClassicStation.keplr
}

injectKeplr()

if (!document.readyState === "complete") {
  document.addEventListener(
    "readystatechange",
    function documentStateChange(event) {
      if (event.target && event.target.readyState === "complete") {
        injectKeplr()
        document.removeEventListener("readystatechange", documentStateChange)
      }
    }
  )
}

