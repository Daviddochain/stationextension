import { useQuery } from "react-query"
import BigNumber from "bignumber.js"
import {
  AccAddress,
  Coin,
  Coins,
  Rewards,
  ValAddress,
  Validator,
} from "@terra-money/feather.js"
import { has } from "utils/num"
import { sortCoins } from "utils/coin"
import { queryKey, RefetchOptions } from "../query"
import { useAddress } from "../wallet"
import { useInterchainLCDClient } from "./lcdClient"
import { CalcValue } from "./coingecko"
import { useInterchainAddresses } from "auth/hooks/useAddress"

export const useRewards = (chainID?: string) => {
  const addresses = useInterchainAddresses()
  const lcd = useInterchainLCDClient()

  return useQuery(
    [queryKey.distribution.rewards, addresses, chainID],
    async () => {
      if (!addresses || !lcd) return { total: new Coins(), rewards: {} }

      if (chainID) {
        const address = addresses[chainID]
        if (!address) return { total: new Coins(), rewards: {} }

        return await lcd.distribution.rewards(address)
      } else {
        const validAddresses = Object.values(addresses ?? {}).filter(
          (address): address is string => Boolean(address)
        )

        if (!validAddresses.length) {
          return { total: new Coins(), rewards: {} }
        }

        const results = await Promise.all(
          validAddresses.map((address) => lcd.distribution.rewards(address))
        )

        let total: Coin.Data[] = []
        let rewards: Rewards["rewards"] = {}

        results.forEach((result) => {
          total = [...total, ...result.total.toData()]
          rewards = { ...rewards, ...result.rewards }
        })

        return { total: Coins.fromData(total), rewards }
      }
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(addresses && lcd),
    }
  )
}

export const useCommunityPool = (chain: string) => {
  const lcd = useInterchainLCDClient()

  return useQuery(
    [queryKey.distribution.communityPool, chain],
    async () => {
      if (!lcd) throw new Error("LCD client is not available")
      return await lcd.distribution.communityPool(chain)
    },
    {
      ...RefetchOptions.INFINITY,
      enabled: Boolean(lcd && chain),
    }
  )
}

/* commission */
// TODO: make interchain
export const useValidatorCommission = () => {
  const lcd = useInterchainLCDClient()
  const address = useAddress()

  return useQuery(
    [queryKey.distribution.validatorCommission, address],
    async () => {
      if (!address) return new Coins()
      if (!lcd) throw new Error("LCD client is not available")

      const validatorAddress = ValAddress.fromAccAddress(
        address,
        AccAddress.getPrefix(address)
      )

      return await lcd.distribution.validatorCommission(validatorAddress)
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(address && lcd),
    }
  )
}

// TODO: make interchain
export const useWithdrawAddress = () => {
  const lcd = useInterchainLCDClient()
  const address = useAddress()

  return useQuery(
    [queryKey.distribution.withdrawAddress, address],
    async () => {
      if (!address) return
      if (!lcd) throw new Error("LCD client is not available")

      return await lcd.distribution.withdrawAddress(address)
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(address && lcd),
    }
  )
}

/* hooks */
export const getConnectedMoniker = (
  address?: string,
  validators?: Validator[]
) => {
  if (!(address && validators)) return

  const validatorAddress = ValAddress.fromAccAddress(
    address,
    AccAddress.getPrefix(address)
  )

  const validator = validators.find(
    ({ operator_address }) => operator_address === validatorAddress
  )

  if (!validator) return

  return validator.description.moniker
}

/* helpers */
export const calcRewardsValues = (
  rewards: Rewards,
  currency: Denom,
  calcValue: CalcValue
) => {
  const calc = (coins: Coins) => {
    const list = sortCoins(coins, currency).filter(({ amount }) => has(amount))
    const sum = BigNumber.sum(
      ...list.map((item) => calcValue(item) ?? 0)
    ).toString()

    return { sum, list }
  }

  const total = calc(rewards.total)
  const byValidator = Object.entries(rewards.rewards ?? {})
    .map(([address, coins]) => ({ ...calc(coins), address }))
    .filter(({ sum }) => has(sum))
    .sort(({ sum: a }, { sum: b }) => Number(b) - Number(a))

  return { total, byValidator }
}
