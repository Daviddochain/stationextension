import { atom, useRecoilState, useRecoilValue } from "recoil"
import { useMemo } from "react"
import { useNetworks } from "app/InitNetworks"
import { getStoredNetwork, storeNetwork } from "../scripts/network"
import { walletState } from "./useAuth"
import { useCustomLCDs } from "utils/localStorage"
import { ChainID, InterchainNetwork } from "types/network"

const networkState = atom({
  key: "network",
  default: getStoredNetwork(),
})

export const useNetworkState = () => {
  const [storedNetwork, setNetwork] = useRecoilState(networkState)

  const changeNetwork = (network: string) => {
    if (network !== storedNetwork) {
      setNetwork(network)
      storeNetwork(network)
    }
  }

  return [storedNetwork, changeNetwork] as const
}

export const useNetworkOptions = () => {
  return [{ value: "all", label: "All Chains" }]
}

export const useNetwork = (): Record<ChainID, InterchainNetwork> => {
  const { networks } = useNetworks()
  const { customLCDs } = useCustomLCDs()
  const wallet = useRecoilValue(walletState)

  const allChains = Object.fromEntries(
    Object.entries(networks ?? {}).map(([chainID, chain]) => [
      chainID,
      {
        ...chain,
        lcd: customLCDs[chainID] ?? chain.lcd,
      },
    ])
  ) as Record<ChainID, InterchainNetwork>

  if (!wallet) return allChains

  const wordsMap = (wallet.words ?? {}) as Record<string, string | undefined>

  return Object.fromEntries(
    Object.entries(allChains).filter(
      ([, chain]) => wordsMap[String(chain.coinType)]
    )
  ) as Record<ChainID, InterchainNetwork>
}

export const useNetworkName = () => {
  return "all"
}

export const useChainID = (): string | undefined => {
  const [storedNetwork] = useNetworkState()
  const networks = useNetwork()

  return useMemo(() => {
    const entries = Object.entries(networks ?? {})
    if (!entries.length) return undefined

    if (storedNetwork && storedNetwork !== "all" && networks[storedNetwork]) {
      return storedNetwork
    }

    return entries[0][0]
  }, [networks, storedNetwork])
}
