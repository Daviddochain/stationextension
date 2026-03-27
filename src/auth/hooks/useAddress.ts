import { useMemo } from "react"
import { useNetworks } from "app/InitNetworks"
import { addressFromWords } from "utils/bech32"
import useAuth from "./useAuth"
import { useNetwork } from "data/wallet"
import { InterchainNetwork } from "types/network"

/* auth | wallet-provider */

type WalletWords = Record<string, string | undefined>
type NetworkMap = Record<string, InterchainNetwork>

const isInterchainNetwork = (network: any): network is InterchainNetwork => {
  return Boolean(
    network &&
      typeof network === "object" &&
      !Array.isArray(network) &&
      "coinType" in network &&
      "chainID" in network &&
      "prefix" in network
  )
}

const flattenNetworks = (networks?: Record<string, any>): NetworkMap => {
  const source = networks ?? {}
  const values = Object.values(source)

  const isFlat = values.every((network) => isInterchainNetwork(network))

  if (isFlat) {
    return source as NetworkMap
  }

  return Object.values(source).reduce<NetworkMap>((acc, group) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) return acc

    Object.entries(group).forEach(([chainID, network]) => {
      if (isInterchainNetwork(network)) {
        acc[chainID] = network
      }
    })

    return acc
  }, {})
}

const mergeNetworks = (
  primary?: Record<string, any>,
  secondary?: Record<string, any>
): NetworkMap => {
  const first = flattenNetworks(primary)
  const second = flattenNetworks(secondary)

  return {
    ...second,
    ...first,
  }
}

const buildInterchainAddresses = (
  words?: WalletWords,
  networks?: NetworkMap
): Record<string, string> | undefined => {
  if (!words) {
    console.warn("buildInterchainAddresses: wallet words missing")
    return undefined
  }

  if (!networks || !Object.keys(networks).length) {
    console.warn("buildInterchainAddresses: networks missing or empty")
    return undefined
  }

  return Object.values(networks).reduce<Record<string, string>>(
    (acc, network) => {
      const { prefix, coinType, chainID } = network
      const mnemonicWords = words[String(coinType)]

      if (!mnemonicWords) {
        console.warn(
          "buildInterchainAddresses: missing wallet words for coinType",
          {
            chainID,
            prefix,
            coinType,
          }
        )
        return acc
      }

      try {
        acc[chainID] = addressFromWords(mnemonicWords, prefix)
      } catch (error) {
        console.error("buildInterchainAddresses: failed to derive address", {
          chainID,
          prefix,
          coinType,
          error,
        })
      }

      return acc
    },
    {}
  )
}

const useAddress = () => {
  const { wallet } = useAuth()
  const runtimeNetworks = useNetwork()
  const { networks: initNetworks } = useNetworks()

  return useMemo(() => {
    const words = wallet?.words as WalletWords | undefined
    if (!words) return undefined

    const mergedNetworks = mergeNetworks(runtimeNetworks, initNetworks)
    const addresses = buildInterchainAddresses(words, mergedNetworks)

    if (!addresses) return undefined

    if (addresses["columbus-5"]) {
      return addresses["columbus-5"]
    }

    const terraClassicLike = Object.values(mergedNetworks).find(
      ({ prefix, coinType }) => prefix === "terra" && coinType === 330
    )

    if (terraClassicLike?.chainID && addresses[terraClassicLike.chainID]) {
      return addresses[terraClassicLike.chainID]
    }

    try {
      return words["330"] ? addressFromWords(words["330"], "terra") : undefined
    } catch (error) {
      console.error("useAddress: failed legacy fallback derivation", { error })
      return undefined
    }
  }, [wallet, runtimeNetworks, initNetworks])
}

export const useAllInterchainAddresses = () => {
  const { wallet } = useAuth()
  const { networks: initNetworks } = useNetworks()
  const runtimeNetworks = useNetwork()

  return useMemo(() => {
    const words = wallet?.words as WalletWords | undefined
    const mergedNetworks = mergeNetworks(runtimeNetworks, initNetworks)

    return buildInterchainAddresses(words, mergedNetworks)
  }, [wallet, initNetworks, runtimeNetworks])
}

export const useInterchainAddresses = () => {
  const { wallet } = useAuth()
  const runtimeNetworks = useNetwork()
  const { networks: initNetworks } = useNetworks()

  return useMemo(() => {
    const words = wallet?.words as WalletWords | undefined
    const mergedNetworks = mergeNetworks(runtimeNetworks, initNetworks)
    const addresses = buildInterchainAddresses(words, mergedNetworks)

    console.log("useInterchainAddresses derived", {
      chainCount: Object.keys(addresses ?? {}).length,
      chains: addresses ? Object.keys(addresses) : [],
      addresses,
    })

    return addresses
  }, [wallet, runtimeNetworks, initNetworks])
}

export const usePubkey = () => {
  const { wallet } = useAuth()
  return wallet?.pubkey
}

export default useAddress
