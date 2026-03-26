import { useQueries, useQuery } from "react-query"
import createContext from "utils/createContext"
import { queryKey, RefetchOptions } from "../query"
import { useInterchainLCDClient } from "./lcdClient"
import { useInterchainAddresses } from "auth/hooks/useAddress"
import { useCustomTokensCW20 } from "data/settings/CustomTokens"
import { useNetwork } from "data/wallet"
import { getChainIDFromAddress } from "utils/bech32"

export const useInitialTokenBalance = () => {
  const addresses = useInterchainAddresses()
  const networks = useNetwork()
  const lcd = useInterchainLCDClient()
  const { list: cw20 } = useCustomTokensCW20()

  return useQueries(
    cw20.map(({ token }) => {
      const chainID = getChainIDFromAddress(token, networks)
      const address = chainID ? addresses?.[chainID] : undefined

      return {
        queryKey: [queryKey.bank.balances, token, chainID, address],
        queryFn: async () => {
          if (!address || !chainID || !lcd)
            return {
              amount: "0",
              denom: token,
              chain: chainID ?? "",
            } as CoinBalance

          try {
            const { balance } = await lcd.wasm.contractQuery<{
              balance: Amount
            }>(token, { balance: { address } })

            return {
              amount: balance,
              denom: token,
              chain: chainID,
            } as CoinBalance
          } catch (error) {
            console.warn(
              `useInitialTokenBalance: failed for token ${token} on chain ${chainID}`
            )

            return {
              amount: "0",
              denom: token,
              chain: chainID,
              unavailable: true,
            } as CoinBalance
          }
        },
        enabled: Boolean(chainID && address && lcd),
        ...RefetchOptions.DEFAULT,
      }
    })
  )
}

export const [useBankBalance, BankBalanceProvider] =
  createContext<CoinBalance[]>("useBankBalance")

export const useInitialBankBalance = () => {
  const lcd = useInterchainLCDClient()
  const addresses = useInterchainAddresses()

  return useQueries(
    Object.entries(addresses ?? {}).map(([chainID, address]) => {
      return {
        queryKey: [queryKey.bank.balances, address, chainID],
        queryFn: async () => {
          if (!address || !lcd) return [] as CoinBalance[]

          try {
            const bal = ["phoenix-1", "pisco-1"].includes(chainID)
              ? await lcd.bank.spendableBalances(address)
              : await lcd.bank.balance(address)

            return bal[0].toArray().map(({ denom, amount }) => ({
              denom,
              amount: amount.toString(),
              chain: chainID,
            })) as CoinBalance[]
          } catch (error) {
            console.warn(`useInitialBankBalance: failed for chain ${chainID}`)
            return [] as CoinBalance[]
          }
        },
        enabled: Boolean(address && lcd),
        ...RefetchOptions.DEFAULT,
      }
    })
  )
}

export interface CoinBalance {
  amount: string
  denom: string
  chain: string
  unavailable?: boolean
}

export const useBalances = () => {
  const addresses = useInterchainAddresses()
  const lcd = useInterchainLCDClient()

  return useQuery(
    [queryKey.bank.balances, addresses],
    async () => {
      if (!addresses || !lcd) return [] as CoinBalance[]

      const chains = Object.keys(addresses)

      const balances = await Promise.all(
        chains.map(async (chain) => {
          const address = addresses[chain]
          if (!address) return null

          try {
            return ["phoenix-1", "pisco-1"].includes(chain)
              ? await lcd.bank.spendableBalances(address)
              : await lcd.bank.balance(address)
          } catch {
            console.warn(`useBalances: failed for chain ${chain}`)
            return null
          }
        })
      )

      const result: CoinBalance[] = []

      chains.forEach((chain, i) => {
        const balanceResult = balances[i]
        if (!balanceResult) return

        balanceResult[0].toArray().forEach(({ denom, amount }) =>
          result.push({
            denom,
            amount: amount.toString(),
            chain,
          })
        )
      })

      return result
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(addresses && Object.keys(addresses).length && lcd),
    }
  )
}

export const useIsWalletEmpty = () => {
  const bankBalance = useBankBalance()
  return !bankBalance?.length
}
