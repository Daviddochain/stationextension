import axios from "axios"
import { STATION_ASSETS } from "config/constants"
import { WhitelistProvider, WhitelistData } from "data/queries/chains"
import { PropsWithChildren, useEffect, useState } from "react"

const normalizeAssetUrl = (url?: string) => {
  if (!url) return url

  if (url.startsWith("undefined/")) {
    return `${STATION_ASSETS}/${url.replace(/^undefined\//, "")}`
  }

  if (url.startsWith("undefined")) {
    return `${STATION_ASSETS}/${url.replace(/^undefined/, "")}`
  }

  if (url.startsWith("http://localhost:3001/")) {
    return url.replace("http://localhost:3001", STATION_ASSETS)
  }

  if (url.startsWith("/img/")) {
    return `${STATION_ASSETS}${url}`
  }

  return url
}

const normalizeTokenMap = <T extends Record<string, any>>(obj?: T): T => {
  return Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [
      key,
      value && typeof value === "object"
        ? {
            ...value,
            icon: normalizeAssetUrl(value.icon),
          }
        : value,
    ])
  ) as T
}

const normalizeNestedTokenMap = <T extends Record<string, any>>(obj?: T): T => {
  return Object.fromEntries(
    Object.entries(obj ?? {}).map(([network, items]) => [
      network,
      normalizeTokenMap(items as Record<string, any>),
    ])
  ) as T
}

const InitChains = ({ children }: PropsWithChildren<{}>) => {
  const [whitelist, setWhitelist] = useState<WhitelistData["whitelist"]>()
  const [ibcDenoms, setIbcDenoms] = useState<WhitelistData["ibcDenoms"]>()
  const legacyWhitelist: WhitelistData["legacyWhitelist"] = {}

  useEffect(() => {
    axios
      .get("/denoms.json", { baseURL: STATION_ASSETS })
      .then(({ data }) => setWhitelist(normalizeNestedTokenMap(data)))
      .catch((error) =>
        console.error("InitChains: failed to fetch denoms.json", error)
      )

    axios
      .get("/ibc_tokens.json", { baseURL: STATION_ASSETS })
      .then(({ data }) => setIbcDenoms(normalizeNestedTokenMap(data)))
      .catch((error) =>
        console.error("InitChains: failed to fetch ibc_tokens.json", error)
      )
  }, [])

  if (!(whitelist && ibcDenoms)) return null

  return (
    <WhitelistProvider value={{ whitelist, ibcDenoms, legacyWhitelist }}>
      {children}
    </WhitelistProvider>
  )
}

export default InitChains
