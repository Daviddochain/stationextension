import { useMemo } from "react"
import { useNetworks } from "app/InitNetworks"
import { InterchainNetwork } from "types/network"

export * from "auth/hooks/useNetwork"
export { default as useAddress } from "auth/hooks/useAddress"

export const useNetwork = (): Record<string, InterchainNetwork> => {
  const { networks } = useNetworks()

  return useMemo(() => {
    const source = networks ?? {}
    const values = Object.values(source)

    const isFlat = values.every(
      (network) =>
        !!network &&
        typeof network === "object" &&
        !Array.isArray(network) &&
        "chainID" in network &&
        "lcd" in network
    )

    if (isFlat) {
      const flat = source as Record<string, InterchainNetwork>
      console.warn("useNetwork FIXED result =", flat)
      return flat
    }

    const flat: Record<string, InterchainNetwork> = {}

    Object.values(source).forEach((group: any) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) return

      Object.entries(group).forEach(([chainID, net]: any) => {
        if (net?.lcd && net?.chainID) {
          flat[chainID] = net as InterchainNetwork
        }
      })
    })

    console.warn("useNetwork FIXED result =", flat)

    return flat
  }, [networks])
}
