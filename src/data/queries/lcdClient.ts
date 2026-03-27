import { useMemo } from "react"
import { LCDClient as InterchainLCDClient } from "@terra-money/feather.js"
import { LCDClient } from "@terra-money/terra.js"
import { useChainID, useNetwork } from "data/wallet"

const getSafeNetworks = (network?: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(network ?? {}).filter(([, chain]) => {
      return (
        !!chain && typeof chain === "object" && !!chain.lcd && !!chain.chainID
      )
    })
  )
}

export const useInterchainLCDClient = () => {
  const network = useNetwork()

  const lcdClient = useMemo(() => {
    const safeNetworks = getSafeNetworks(network)
    if (Object.keys(safeNetworks).length === 0) return undefined

    try {
      return new InterchainLCDClient(safeNetworks)
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
