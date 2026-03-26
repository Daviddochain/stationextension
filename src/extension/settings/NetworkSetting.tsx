import { useMemo } from "react"
import { useNetworkState } from "data/wallet"
import { useNetworks } from "app/InitNetworks"
import { RadioGroup } from "components/form"
import { InterchainNetwork } from "types/network"

const NetworkSetting = () => {
  const [network, setNetwork] = useNetworkState()
  const { networks } = useNetworks()

  const flatOptions = useMemo(() => {
    if (!networks) return []

    const list = Object.values(
      networks as Record<string, InterchainNetwork>
    ).map((chain) => ({
      label: chain.name,
      value: chain.chainID,
    }))

    const seen = new Set<string>()
    return list.filter((item) => {
      if (seen.has(item.label)) return false
      seen.add(item.label)
      return true
    })
  }, [networks])

  if (!flatOptions.length) return null

  return (
    <RadioGroup
      options={flatOptions}
      value={network}
      onChange={(value) => setNetwork(value as string)}
    />
  )
}

export default NetworkSetting
