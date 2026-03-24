import { useMemo } from "react"
import { useNetworkState } from "data/wallet"
import { useNetworks } from "app/InitNetworks"
import { RadioGroup } from "components/form"

const NetworkSetting = () => {
  const [network, setNetwork] = useNetworkState()
  const { networks } = useNetworks()

  const flatOptions = useMemo(() => {
    if (!networks) return []

    // Order how you want chains shown
    const order = ["classic", "mainnet"] as const

    const list = order.flatMap((groupName) => {
      const group = networks[groupName]
      if (!group) return []

      return Object.values(group).map((chain) => ({
        label: chain.name,
        value: groupName, // IMPORTANT: still maps to group
      }))
    })

    // remove duplicates by label
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
      onChange={(value) => setNetwork(value as any)}
    />
  )
}

export default NetworkSetting
