import { PropsWithChildren, useEffect, useState } from "react"
import axios from "axios"
import { STATION_ASSETS } from "config/constants"
import createContext from "utils/createContext"
import { useCustomChains, useCustomLCDs } from "utils/localStorage"
import { useValidNetworks } from "data/queries/tendermint"
import { WithFetching } from "components/feedback"
import { combineState } from "data/query"
import { InterchainNetworks } from "types/network"

export const [useNetworks, NetworksProvider] = createContext<{
  networks: InterchainNetworks
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

const normalizeChainGroup = <T extends Record<string, any>>(group?: T): T => {
  return Object.fromEntries(
    Object.entries(group ?? {}).map(([key, value]) => [
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

const InitNetworks = ({ children }: PropsWithChildren<{}>) => {
  const [defaultNetworks, setNetworks] = useState<InterchainNetworks>()
  const { customLCDs } = useCustomLCDs()
  const { customChains } = useCustomChains()

  const networks = {
    mainnet: {
      ...customChains?.mainnet,
      ...defaultNetworks?.mainnet,
    },
    testnet: {
      ...customChains?.testnet,
      ...defaultNetworks?.testnet,
    },
    classic: {
      ...customChains?.classic,
      ...defaultNetworks?.classic,
    },
    localterra: {
      ...defaultNetworks?.localterra,
    },
  }

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await axios.get<InterchainNetworks>("/chains.json", {
          baseURL: STATION_ASSETS,
        })

        const chains = response?.data

        if (!chains) {
          console.error("InitNetworks: no chains.json data returned")
          return
        }

        setNetworks({
          ...chains,
          mainnet: normalizeChainGroup(chains.mainnet),
          testnet: normalizeChainGroup(chains.testnet),
          classic: normalizeChainGroup(chains.classic),
          localterra: normalizeChainGroup(chains.localterra),
        })
      } catch (error) {
        console.error("InitNetworks: failed to fetch chains.json", error)
      }
    }

    fetchChains()
  }, [])

  const testBase = networks
    ? Object.values({
        ...networks.mainnet,
        ...networks.testnet,
        ...networks.classic,
      }).map((chain) => {
        const lcd = customLCDs[chain?.chainID] ?? chain.lcd
        return { ...chain, lcd }
      })
    : []

  const validationResult = useValidNetworks(testBase)

  const validNetworks = validationResult.reduce(
    (acc, { data }) => (data ? [...acc, data] : acc),
    [] as string[]
  )
  const validationState = combineState(...validationResult)

  if (!networks) return null

  return (
    <WithFetching {...validationState} height={2}>
      {(progress) => (
        <NetworksProvider
          value={{
            networks,
            networksLoading: validationState.isLoading,
            filterEnabledNetworks: (networks) =>
              Object.fromEntries(
                Object.entries(networks ?? {}).filter(
                  ([chainID]) =>
                    chainID === "localterra" || validNetworks.includes(chainID)
                ) ?? {}
              ),
            filterDisabledNetworks: (networks) =>
              Object.fromEntries(
                Object.entries(networks ?? {}).filter(
                  ([chainID]) => !validNetworks.includes(chainID)
                ) ?? {}
              ),
          }}
        >
          {progress}
          {children}
        </NetworksProvider>
      )}
    </WithFetching>
  )
}

export default InitNetworks
