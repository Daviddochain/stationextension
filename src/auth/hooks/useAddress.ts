import { useNetworks } from "app/InitNetworks"
import { addressFromWords } from "utils/bech32"
import useAuth from "./useAuth"
import { useNetwork } from "data/wallet"
import { InterchainNetwork } from "types/network"

/* auth | wallet-provider */

type WalletWords = Record<string, string | undefined>

const useAddress = () => {
  const { wallet } = useAuth()

  return wallet?.words?.["330"]
    ? addressFromWords(wallet.words["330"], "terra")
    : undefined
}

export const useAllInterchainAddresses = () => {
  const { wallet } = useAuth()
  const { networks } = useNetworks()

  const words = wallet?.words as WalletWords | undefined
  if (!words) return

  return Object.values(networks ?? {})
    .filter((network): network is InterchainNetwork => {
      return !!network && typeof network === "object" && "coinType" in network
    })
    .reduce((acc, { prefix, coinType, chainID }) => {
      const mnemonic = words[String(coinType)]
      if (!mnemonic) return acc

      acc[chainID] = addressFromWords(mnemonic, prefix)
      return acc
    }, {} as Record<string, string>)
}

export const useInterchainAddresses = () => {
  const { wallet } = useAuth()
  const networks = useNetwork()

  const words = wallet?.words as WalletWords | undefined
  if (!words) return

  return Object.values(networks ?? {})
    .filter((network): network is InterchainNetwork => {
      return !!network && typeof network === "object" && "coinType" in network
    })
    .reduce((acc, { prefix, coinType, chainID }) => {
      const mnemonic = words[String(coinType)]
      if (!mnemonic) return acc

      acc[chainID] = addressFromWords(mnemonic, prefix)
      return acc
    }, {} as Record<string, string>)
}

export const usePubkey = () => {
  const { wallet } = useAuth()
  return wallet?.pubkey
}

export default useAddress
