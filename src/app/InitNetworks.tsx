import { PropsWithChildren, useEffect, useState, useMemo } from "react"
import axios from "axios"
import { STATION_ASSETS } from "config/constants"
import createContext from "utils/createContext"
import { useCustomChains, useCustomLCDs } from "utils/localStorage"

type ChainConfig = Record<string, any>
type NetworkGroups = Record<string, Record<string, ChainConfig>>

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

const normalizeCustomLCDs = (
  value?: Record<string, string | undefined>
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(
      ([, lcd]) => typeof lcd === "string" && lcd.length > 0
    )
  ) as Record<string, string>
}

const normalizeChains = (groups?: Record<string, any>): NetworkGroups => {
  return Object.fromEntries(
    Object.entries(groups ?? {}).map(([groupName, chain]) => {
      const chainID = chain?.chainID ?? groupName

      return [
        groupName,
        {
          [chainID]: {
            ...(chain ?? {}),
            icon: normalizeAssetUrl(chain?.icon),
          },
        },
      ]
    })
  ) as NetworkGroups
}

const normalizeCustomChains = (groups?: Record<string, any>): NetworkGroups => {
  return Object.fromEntries(
    Object.entries(groups ?? {}).map(([groupName, value]) => {
      const isAlreadyGrouped =
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            ("chainID" in item || "lcd" in item || "rpc" in item)
        )

      if (isAlreadyGrouped) {
        return [
          groupName,
          Object.fromEntries(
            Object.entries(value as Record<string, any>).map(
              ([chainID, chain]) => {
                const c = chain as Record<string, any>

                return [
                  chainID,
                  {
                    ...c,
                    icon: normalizeAssetUrl(c?.icon),
                  },
                ]
              }
            )
          ),
        ]
      }

      const chainID = value?.chainID ?? groupName

      return [
        groupName,
        {
          [chainID]: {
            ...(value ?? {}),
            icon: normalizeAssetUrl(value?.icon),
          },
        },
      ]
    })
  ) as NetworkGroups
}

const filterDuplicatePrefixes = (groups?: NetworkGroups): NetworkGroups => {
  const seenPrefixes: Record<string, string> = {}

  return Object.fromEntries(
    Object.entries(groups ?? {}).map(([groupName, chains]) => [
      groupName,
      Object.fromEntries(
        Object.entries(chains ?? {}).filter(([chainID, chain]) => {
          const prefix = chain?.prefix

          if (!prefix) return true

          if (seenPrefixes[prefix]) {
            console.warn(
              `InitNetworks: allowing ${chainID} with duplicate prefix "${prefix}" also used by ${seenPrefixes[prefix]}`
            )
            return true
          }

          seenPrefixes[prefix] = chainID
          return true
        })
      ),
    ])
  ) as NetworkGroups
}

const applyCustomLCDs = (
  groups: NetworkGroups,
  customLCDs: Record<string, string>
): NetworkGroups => {
  return Object.fromEntries(
    Object.entries(groups ?? {}).map(([groupName, chains]) => [
      groupName,
      Object.fromEntries(
        Object.entries(chains ?? {}).map(([chainID, chain]) => [
          chainID,
          {
            ...(chain ?? {}),
            lcd: customLCDs[chainID] ?? chain?.lcd,
          },
        ])
      ),
    ])
  ) as NetworkGroups
}

const InitNetworks = ({ children }: PropsWithChildren<{}>) => {
  const [defaultNetworks, setNetworks] = useState<NetworkGroups>()
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
    const merged: NetworkGroups = {
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
