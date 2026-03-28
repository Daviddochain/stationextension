import { useMemo } from "react"
import { useQueries, useQuery } from "react-query"
import { LCDClient } from "@terra-money/terra.js"
import createContext from "utils/createContext"
import { queryKey, RefetchOptions } from "../query"
import { useInterchainAddresses } from "auth/hooks/useAddress"
import { useCustomTokensCW20 } from "data/settings/CustomTokens"
import { useNetwork } from "data/wallet"
import { getChainIDFromAddress } from "utils/bech32"

const useLCDClients = () => {
  const networks = useNetwork()

  return useMemo(() => {
    return Object.fromEntries(
      Object.entries(networks ?? {}).map(([chainID, chain]) => {
        try {
          if (!chain?.lcd) return [chainID, undefined]

          return [
            chainID,
            new LCDClient({
              ...chain,
              URL: chain.lcd,
            }),
          ]
        } catch (error) {
          console.warn(
            `useLCDClients: failed to create client for ${chainID}`,
            {
              chainID,
              chain,
              error,
            }
          )
          return [chainID, undefined]
        }
      })
    ) as Record<string, LCDClient | undefined>
  }, [networks])
}

export const useInitialTokenBalance = () => {
  const addresses = useInterchainAddresses() ?? {}
  const networks = useNetwork()
  const lcdClients = useLCDClients()
  const { list: cw20 } = useCustomTokensCW20()

  return useQueries(
    cw20.map(({ token }) => {
      const chainID = getChainIDFromAddress(token, networks)
      const address = chainID ? addresses[chainID] : undefined
      const lcd = chainID ? lcdClients[chainID] : undefined

      return {
        queryKey: [queryKey.bank.balances, token, chainID, address],
        queryFn: async () => {
          if (!address || !chainID || !lcd) {
            return {
              amount: "0",
              denom: token,
              chain: chainID ?? "",
            } as CoinBalance
          }

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
            console.error("useInitialTokenBalance failed", {
              token,
              chainID,
              address,
              lcd: lcd.config?.URL,
              error,
            })

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
  const addresses = useInterchainAddresses() ?? {}
  const lcdClients = useLCDClients()

  return useQueries(
    Object.entries(addresses).map(([chainID, address]) => {
      const lcd = lcdClients[chainID]

      return {
        queryKey: [queryKey.bank.balances, address, chainID],
        queryFn: async () => {
          if (!address || !lcd) {
            return [] as CoinBalance[]
          }

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
            console.error("useInitialBankBalance failed", {
              chainID,
              address,
              lcd: lcd.config?.URL,
              error,
            })
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
  const addresses = useInterchainAddresses() ?? {}
  const lcdClients = useLCDClients()

  return useQuery(
    [queryKey.bank.balances, addresses],
    async () => {
      const chains = Object.keys(addresses)
      if (!chains.length) return [] as CoinBalance[]

      const balances = await Promise.all(
        chains.map(async (chain) => {
          const address = addresses[chain]
          const lcd = lcdClients[chain]

          if (!address || !lcd) {
            return null
          }

          try {
            return ["phoenix-1", "pisco-1"].includes(chain)
              ? await lcd.bank.spendableBalances(address)
              : await lcd.bank.balance(address)
          } catch (error) {
            console.error("useBalances failed", {
              chain,
              address,
              lcd: lcd.config?.URL,
              error,
            })
            return null
          }
        })
      )

      const result: CoinBalance[] = []

      chains.forEach((chain, i) => {
        const balanceResult = balances[i]
        if (!balanceResult) return

        const mapped = balanceResult[0].toArray().map(({ denom, amount }) => ({
          denom,
          amount: amount.toString(),
          chain,
        })) as CoinBalance[]

        result.push(...mapped)
      })

      return result
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(Object.keys(addresses).length),
    }
  )
}

export const useIsWalletEmpty = () => {
  const bankBalance = useBankBalance()
  return !bankBalance?.length
}
