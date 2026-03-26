import { AccAddress } from "@terra-money/feather.js"

type NetworkName = string
type ChainID = string

// 🔥 FLATTENED (no more buckets)
type InterchainNetworks = Record<ChainID, InterchainNetwork>

type IBCChannel = string

interface InterchainNetwork {
  chainID: ChainID
  lcd: string
  api?: string
  rpc?: string
  gasAdjustment: number
  gasPrices: Record<string, number | string>
  prefix: string
  baseAsset: string
  name: string
  icon: string
  coinType: "118" | "330" | number | string
  alliance?: boolean
  channels?: Record<ChainID, IBCChannel>

  // keep both styles (old + new compatibility)
  ibc?: {
    fromTerra?: IBCChannel
    toTerra?: IBCChannel
    ics?: any
  }

  icsChannels?: Record<
    ChainID,
    {
      contract: AccAddress
      channel: IBCChannel
      otherChannel: IBCChannel
    }
  >

  version?: string
  isClassic?: boolean
  isCustom?: boolean

  explorer?: {
    address?: string
    tx?: string
    validator?: string
    block?: string
  }
}

interface TerraNetwork {
  name: NetworkName
  chainID: string
  lcd: string
  api?: string
}

type CustomNetworks = Record<ChainID, CustomNetwork>

interface CustomNetwork extends TerraNetwork {
  preconfigure?: boolean
}
