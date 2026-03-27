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
  const addresses = useInterchainAddresses()
  const networks = useNetwork()
  const lcdClients = useLCDClients()
  const { list: cw20 } = useCustomTokensCW20()

  return useQueries(
    cw20.map(({ token }) => {
      const chainID = getChainIDFromAddress(token, networks)
      const address = chainID ? addresses?.[chainID] : undefined
      const lcd = chainID ? lcdClients[chainID] : undefined

      return {
        queryKey: [queryKey.bank.balances, token, chainID, address],
        queryFn: async () => {
          if (!address || !chainID || !lcd) {
            console.warn(
              "useInitialTokenBalance skipped =",
              JSON.stringify(
                {
                  token,
                  chainID,
                  address,
                  hasLCD: Boolean(lcd),
                },
                null,
                2
              )
            )

            return {
              amount: "0",
              denom: token,
              chain: chainID ?? "",
            } as CoinBalance
          }

          try {
            console.warn(
              "Querying CW20 token balance =",
              JSON.stringify(
                {
                  token,
                  chainID,
                  address,
                  lcd: lcd.config?.URL,
                },
                null,
                2
              )
            )

            const { balance } = await lcd.wasm.contractQuery<{
              balance: Amount
            }>(token, { balance: { address } })

            const mapped = {
              amount: balance,
              denom: token,
              chain: chainID,
            } as CoinBalance

            console.warn(
              "Mapped CW20 token balance for frontend =",
              JSON.stringify(
                {
                  token,
                  chainID,
                  address,
                  mapped,
                },
                null,
                2
              )
            )

            return mapped
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
  const addresses = useInterchainAddresses()
  const lcdClients = useLCDClients()

  console.warn(
    "useInitialBankBalance addresses =",
    JSON.stringify(addresses, null, 2)
  )

  console.warn(
    "useInitialBankBalance lcdClients =",
    JSON.stringify(
      Object.fromEntries(
        Object.entries(lcdClients ?? {}).map(([k, v]) => [
          k,
          v ? { url: v.config?.URL } : null,
        ])
      ),
      null,
      2
    )
  )

  return useQueries(
    Object.entries(addresses ?? {}).map(([chainID, address]) => {
      const lcd = lcdClients[chainID]

      console.warn(
        "Preparing bank query =",
        JSON.stringify(
          {
            chainID,
            address,
            hasLCD: Boolean(lcd),
            lcd: lcd?.config?.URL,
          },
          null,
          2
        )
      )

      return {
        queryKey: [queryKey.bank.balances, address, chainID],
        queryFn: async () => {
          if (!address || !lcd) {
            console.warn(
              "useInitialBankBalance skipped =",
              JSON.stringify(
                {
                  chainID,
                  address,
                  hasLCD: Boolean(lcd),
                },
                null,
                2
              )
            )
            return [] as CoinBalance[]
          }

          try {
            console.warn(
              "Querying bank balance =",
              JSON.stringify(
                {
                  chainID,
                  address,
                  lcd: lcd.config?.URL,
                },
                null,
                2
              )
            )

            const bal = ["phoenix-1", "pisco-1"].includes(chainID)
              ? await lcd.bank.spendableBalances(address)
              : await lcd.bank.balance(address)

            const mapped = bal[0].toArray().map(({ denom, amount }) => ({
              denom,
              amount: amount.toString(),
              chain: chainID,
            })) as CoinBalance[]

            console.warn(
              "Mapped bank balances for frontend =",
              JSON.stringify(
                {
                  chainID,
                  address,
                  mapped,
                },
                null,
                2
              )
            )

            return mapped
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
  const addresses = useInterchainAddresses()
  const lcdClients = useLCDClients()

  return useQuery(
    [queryKey.bank.balances, addresses],
    async () => {
      if (!addresses) return [] as CoinBalance[]

      const chains = Object.keys(addresses)

      const balances = await Promise.all(
        chains.map(async (chain) => {
          const address = addresses[chain]
          const lcd = lcdClients[chain]

          if (!address || !lcd) {
            console.warn(
              "useBalances skipped =",
              JSON.stringify(
                {
                  chain,
                  address,
                  hasLCD: Boolean(lcd),
                },
                null,
                2
              )
            )
            return null
          }

          try {
            console.warn(
              "Querying balances =",
              JSON.stringify(
                {
                  chain,
                  address,
                  lcd: lcd.config?.URL,
                },
                null,
                2
              )
            )

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

        console.warn(
          "Mapped balances for frontend =",
          JSON.stringify(
            {
              chain,
              address: addresses[chain],
              mapped,
            },
            null,
            2
          )
        )

        result.push(...mapped)
      })

      console.warn(
        "Final merged balances for frontend =",
        JSON.stringify(result, null, 2)
      )

      return result
    },
    {
      ...RefetchOptions.DEFAULT,
      enabled: Boolean(addresses && Object.keys(addresses).length),
    }
  )
}

export const useIsWalletEmpty = () => {
  const bankBalance = useBankBalance()
  return !bankBalance?.length
}
