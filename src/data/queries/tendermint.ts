import { VALIDATION_TIMEOUT } from "config/constants"
import { queryKey, RefetchOptions } from "../query"
import { useQueries, useQuery } from "react-query"
import { useNetworks } from "app/InitNetworks"
import { randomAddress } from "utils/bech32"
import axios from "axios"

export const useLocalNodeInfo = (chainID: string) => {
  const { networks } = useNetworks()

  return useQuery(
    [queryKey.tendermint.nodeInfo, chainID],
    async () => {
      try {
        const chainGroup = networks?.localterra
        const localterraNetwork =
          chainGroup && "localterra" in chainGroup
            ? chainGroup.localterra
            : undefined

        if (!localterraNetwork?.lcd) return undefined

        const { data } = await axios.get(
          "cosmos/base/tendermint/v1beta1/node_info",
          {
            baseURL: localterraNetwork.lcd,
          }
        )

        return data
      } catch (error) {
        console.warn(`useLocalNodeInfo: failed for ${chainID}`, error)
        return undefined
      }
    },
    { ...RefetchOptions.INFINITY, enabled: chainID === "localterra" }
  )
}

export const useValidateLCD = (
  lcd?: string,
  chainID?: string,
  enabled?: boolean
) => {
  return useQuery(
    [lcd, chainID],
    async () => {
      if (!lcd || !chainID) return

      try {
        const url = new URL(lcd)
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return "The LCD must be an HTTP or HTTPS URL"
        }
      } catch (_) {
        return "Invalid URL provided"
      }

      try {
        const { data } = await axios.get(
          "/cosmos/base/tendermint/v1beta1/node_info",
          {
            baseURL: lcd,
            timeout: 3_000,
          }
        )

        const nodeChain =
          "default_node_info" in data
            ? (data.default_node_info.network as string)
            : (data.node_info.network as string)

        if (nodeChain !== chainID) {
          return `Invalid chain. Expected ${chainID}, got ${nodeChain}.`
        }
      } catch (e) {
        return "Unable to connect to the LCD"
      }
    },
    { ...RefetchOptions.INFINITY, enabled }
  )
}

interface Network {
  chainID: string
  prefix: string
  lcd: string
}

export const useValidNetworks = (networks: Network[]) => {
  return useQueries(
    networks.map(({ chainID, prefix, lcd }) => {
      return {
        queryKey: [queryKey.tendermint.nodeInfo, lcd, chainID],
        queryFn: async () => {
          if (!lcd || !chainID || !prefix) return undefined

          try {
            if (prefix === "terra") return chainID

            const { data } = (await axios.get(
              `/cosmos/bank/v1beta1/balances/${randomAddress(prefix)}`,
              {
                baseURL: lcd,
                timeout: VALIDATION_TIMEOUT,
              }
            )) || { data: {} }

            if (Array.isArray(data?.balances)) return chainID

            return undefined
          } catch (error) {
            console.warn(`useValidNetworks: ${chainID} unavailable`, error)
            return undefined
          }
        },
        retry: false,
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      }
    })
  )
}
