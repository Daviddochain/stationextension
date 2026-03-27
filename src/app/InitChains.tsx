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

const normalizeTokenRecord = <T extends Record<string, any>>(obj?: T): T => {
  return Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [
      key,
      value && typeof value === "object" && !Array.isArray(value)
        ? {
            ...value,
            icon: normalizeAssetUrl(value.icon),
          }
        : value,
    ])
  ) as T
}

const denomsArrayToWhitelist = (denoms: any[]): WhitelistData["whitelist"] => {
  return (denoms ?? []).reduce((acc, item) => {
    if (!item || typeof item !== "object") return acc

    const chainID = item.chainID ?? item.chain
    const token = item.token ?? item.denom

    if (!chainID || !token) return acc

    const tokenID = `${chainID}:${token}`

    acc[tokenID] = {
      ...item,
      token,
      icon: normalizeAssetUrl(item.icon),
    }

    return acc
  }, {} as WhitelistData["whitelist"])
}

const sanitizeIbcDenoms = (obj: any): WhitelistData["ibcDenoms"] => {
  const entries = Object.entries(obj ?? {})

  const isFlatRecord = entries.every(([, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false
    const record = value as { token?: unknown; chainID?: unknown }
    return Boolean(record.token && record.chainID)
  })

  if (isFlatRecord) {
    return Object.fromEntries(
      entries.filter(([, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          return false

        const record = value as { token?: unknown; chainID?: unknown }
        return Boolean(record.token && record.chainID)
      })
    ) as WhitelistData["ibcDenoms"]
  }

  return Object.fromEntries(
    entries.map(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return [key, {}]
      }

      return [
        key,
        Object.fromEntries(
          Object.entries(value).filter(([, nestedValue]) => {
            if (
              !nestedValue ||
              typeof nestedValue !== "object" ||
              Array.isArray(nestedValue)
            ) {
              return false
            }

            const record = nestedValue as { token?: unknown; chainID?: unknown }
            return Boolean(record.token && record.chainID)
          })
        ),
      ]
    })
  ) as WhitelistData["ibcDenoms"]
}

const InitChains = ({ children }: PropsWithChildren<{}>) => {
  const [whitelist, setWhitelist] = useState<WhitelistData["whitelist"]>({})
  const [ibcDenoms, setIbcDenoms] = useState<WhitelistData["ibcDenoms"]>({})
  const [loaded, setLoaded] = useState(false)
  const legacyWhitelist: WhitelistData["legacyWhitelist"] = {}

  useEffect(() => {
    Promise.allSettled([
      axios.get("/denoms.json", { baseURL: STATION_ASSETS }),
      axios.get("/ibc_tokens.json", { baseURL: STATION_ASSETS }),
    ]).then(([denomsResult, ibcResult]) => {
      if (denomsResult.status === "fulfilled") {
        const data = denomsResult.value.data

        if (Array.isArray(data)) {
          setWhitelist(denomsArrayToWhitelist(data))
        } else if (data && typeof data === "object") {
          setWhitelist(normalizeTokenRecord(data))
        } else {
          console.error("InitChains: unexpected denoms.json format", data)
          setWhitelist({})
        }
      } else {
        console.error(
          "InitChains: failed to fetch denoms.json",
          denomsResult.reason
        )
        setWhitelist({})
      }

      if (ibcResult.status === "fulfilled") {
        const data = ibcResult.value.data

        if (data && typeof data === "object" && !Array.isArray(data)) {
          const resolved = data.all ?? data
          setIbcDenoms(sanitizeIbcDenoms(normalizeTokenRecord(resolved)))
        } else {
          console.error("InitChains: unexpected ibc_tokens.json format", data)
          setIbcDenoms({})
        }
      } else {
        console.error(
          "InitChains: failed to fetch ibc_tokens.json",
          ibcResult.reason
        )
        setIbcDenoms({})
      }

      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  return (
    <WhitelistProvider value={{ whitelist, ibcDenoms, legacyWhitelist }}>
      {children}
    </WhitelistProvider>
  )
}

export default InitChains
