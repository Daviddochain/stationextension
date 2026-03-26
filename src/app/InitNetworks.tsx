import { PropsWithChildren, useEffect, useState, useMemo } from "react"
import axios from "axios"
import { STATION_ASSETS } from "config/constants"
import createContext from "utils/createContext"
import { useCustomChains, useCustomLCDs } from "utils/localStorage"

export const [useNetworks, NetworksProvider] = createContext<{
  networks: Record<string, any>
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

const normalizeChains = (chains?: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(chains ?? {}).map(([chainID, chain]) => [
      chainID,
      {
        ...chain,
        icon: normalizeAssetUrl(chain.icon),
      },
    ])
  )
}

const InitNetworks = ({ children }: PropsWithChildren<{}>) => {
  const [defaultNetworks, setNetworks] = useState<Record<string, any>>()
  const { customLCDs } = useCustomLCDs()
  const { customChains } = useCustomChains()

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await axios.get<Record<string, any>>("/chains.json", {
          baseURL: STATION_ASSETS,
        })

        const chains = response?.data

        if (!chains) {
          console.error("InitNetworks: no chains.json data returned")
          return
        }

        setNetworks(normalizeChains(chains))
      } catch (error) {
        console.error("InitNetworks: failed to fetch chains.json", error)
      }
    }

    fetchChains()
  }, [])

  const networks = useMemo(() => {
    return {
      ...(defaultNetworks ?? {}),
      ...(customChains ?? {}),
    }
  }, [defaultNetworks, customChains])

  const networksWithLCD = useMemo(() => {
    return Object.fromEntries(
      Object.entries(networks ?? {}).map(([chainID, chain]) => [
        chainID,
        {
          ...chain,
          lcd: customLCDs[chainID] ?? chain.lcd,
        },
      ])
    )
  }, [networks, customLCDs])

  if (!networksWithLCD) return null

  return (
    <NetworksProvider
      value={{
        networks: networksWithLCD,
        networksLoading: false,

        // no filtering → all chains equal
        filterEnabledNetworks: (networks) => networks ?? {},
        filterDisabledNetworks: () => ({}),
      }}
    >
      {children}
    </NetworksProvider>
  )
}

export default InitNetworks
