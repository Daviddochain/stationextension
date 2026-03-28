import { PropsWithChildren, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { STATION_ASSETS } from "config/constants"
import createContext from "utils/createContext"
import { useCustomChains, useCustomLCDs } from "utils/localStorage"

type ChainConfig = Record<string, any>
type NetworkMap = Record<string, ChainConfig>

export const [useNetworks, NetworksProvider] = createContext<{
  networks: NetworkMap
  networksLoading: boolean
  filterEnabledNetworks: <T>(network: Record<string, T>) => Record<string, T>
  filterDisabledNetworks: <T>(network: Record<string, T>) => Record<string, T>
}>("useNetworks")

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

const normalizeCustomLCDs = (
  value?: Record<string, string | undefined>
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(
      ([, lcd]) => typeof lcd === "string" && lcd.length > 0
    )
  ) as Record<string, string>
}

const normalizeChains = (chains?: Record<string, any>): NetworkMap => {
  return Object.fromEntries(
    Object.entries(chains ?? {}).map(([chainID, chain]) => [
      chainID,
      {
        ...(chain ?? {}),
        chainID: chain?.chainID ?? chainID,
        icon: normalizeAssetUrl(chain?.icon),
      },
    ])
  ) as NetworkMap
}

const normalizeCustomChains = (chains?: Record<string, any>): NetworkMap => {
  return Object.fromEntries(
    Object.entries(chains ?? {}).map(([chainID, chain]) => [
      chainID,
      {
        ...(chain ?? {}),
        chainID: chain?.chainID ?? chainID,
        icon: normalizeAssetUrl(chain?.icon),
      },
    ])
  ) as NetworkMap
}

const filterDuplicatePrefixes = (chains?: NetworkMap): NetworkMap => {
  const seenPrefixes: Record<string, string> = {}

  return Object.fromEntries(
    Object.entries(chains ?? {}).filter(([chainID, chain]) => {
      const prefix = chain?.prefix

      if (!prefix) return true

      if (seenPrefixes[prefix]) {
        console.warn(
          `InitNetworks: dropping ${chainID} with duplicate prefix "${prefix}" already used by ${seenPrefixes[prefix]}`
        )
        return false
      }

      seenPrefixes[prefix] = chainID
      return true
    })
  ) as NetworkMap
}

const applyCustomLCDs = (
  chains: NetworkMap,
  customLCDs: Record<string, string>
): NetworkMap => {
  return Object.fromEntries(
    Object.entries(chains ?? {}).map(([chainID, chain]) => [
      chainID,
      {
        ...(chain ?? {}),
        lcd: customLCDs[chainID] ?? chain?.lcd,
      },
    ])
  ) as NetworkMap
}

const InitNetworks = ({ children }: PropsWithChildren<{}>) => {
  const [defaultNetworks, setNetworks] = useState<NetworkMap>()
  const { customLCDs } = useCustomLCDs()
  const { customChains } = useCustomChains()

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await axios.get<Record<string, any>>("/chains.json", {
          baseURL: STATION_ASSETS,
        })

        const chains = response?.data

        if (!chains || typeof chains !== "object" || Array.isArray(chains)) {
          console.error("InitNetworks: invalid chains.json data", chains)
          setNetworks({})
          return
        }

        setNetworks(normalizeChains(chains))
      } catch (error) {
        console.error("InitNetworks: failed to fetch chains.json", error)
        setNetworks({})
      }
    }

    fetchChains()
  }, [])

  const safeCustomLCDs = useMemo(
    () => normalizeCustomLCDs(customLCDs),
    [customLCDs]
  )

  const networks = useMemo(() => {
    const merged: NetworkMap = {
      ...(defaultNetworks ?? {}),
      ...(normalizeCustomChains(customChains) ?? {}),
    }

    return applyCustomLCDs(filterDuplicatePrefixes(merged), safeCustomLCDs)
  }, [defaultNetworks, customChains, safeCustomLCDs])

  if (!defaultNetworks) return null

  return (
    <NetworksProvider
      value={{
        networks,
        networksLoading: false,
        filterEnabledNetworks: (networks) => networks ?? {},
        filterDisabledNetworks: () => ({}),
      }}
    >
      {children}
    </NetworksProvider>
  )
}

export default InitNetworks
