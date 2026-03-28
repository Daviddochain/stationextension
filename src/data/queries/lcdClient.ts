import { useMemo } from "react"
import { LCDClient as InterchainLCDClient } from "@terra-money/feather.js"
import { LCDClient } from "@terra-money/terra.js"
import { useChainID, useNetwork } from "data/wallet"

const getSafeNetworks = (network?: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(network ?? {}).filter(([, chain]) => {
      return (
        !!chain &&
        typeof chain === "object" &&
        !!chain.lcd &&
        !!chain.chainID &&
        !!chain.prefix
      )
    })
  )
}

const dedupeNetworksByPrefix = (network?: Record<string, any>) => {
  const seenPrefixes: Record<string, string> = {}

  return Object.fromEntries(
    Object.entries(network ?? {}).filter(([chainID, chain]) => {
      const prefix = chain?.prefix

      if (!prefix) return false

      if (seenPrefixes[prefix]) {
        console.warn(
          `useInterchainLCDClient: dropping ${chainID} because prefix "${prefix}" is already used by ${seenPrefixes[prefix]}`
        )
        return false
      }

      seenPrefixes[prefix] = chainID
      return true
    })
  )
}

export const useInterchainLCDClient = () => {
  const network = useNetwork()

  const lcdClient = useMemo(() => {
    const safeNetworks = getSafeNetworks(network)
    const dedupedNetworks = dedupeNetworksByPrefix(safeNetworks)

    console.log("useInterchainLCDClient safeNetworks =", safeNetworks)
    console.log("useInterchainLCDClient dedupedNetworks =", dedupedNetworks)

    if (Object.keys(dedupedNetworks).length === 0) return undefined

    try {
      return new InterchainLCDClient(dedupedNetworks)
    } catch (err) {
      console.error("Failed to create InterchainLCDClient:", err)
      return undefined
    }
  }, [network])

  return lcdClient
}

export const useLCDClient = () => {
  const network = useNetwork()
  const chainID = useChainID()

  const lcdClient = useMemo(() => {
    if (!network || !chainID) return undefined

    const chain = network?.[chainID]
    if (!chain || !chain.lcd || !chain.chainID) return undefined

    try {
      return new LCDClient({
        ...chain,
        URL: chain.lcd,
      })
    } catch (err) {
      console.error("Failed to create LCDClient:", err)
      return undefined
    }
  }, [network, chainID])

  return lcdClient
}

export const useLCDClientForChain = (chainID?: string) => {
  const network = useNetwork()

  const lcdClient = useMemo(() => {
    if (!network || !chainID) return undefined

    const chain = network?.[chainID]
    if (!chain || !chain.lcd || !chain.chainID) return undefined

    try {
      return new LCDClient({
        ...chain,
        URL: chain.lcd,
      })
    } catch (err) {
      console.error(`Failed to create LCDClient for chain ${chainID}:`, err)
      return undefined
    }
  }, [network, chainID])

  return lcdClient
}
