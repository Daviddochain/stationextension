import { useQueries, useQuery } from "react-query"
import { isDenom, isDenomLuna, isDenomTerra } from "@terra-money/terra-utils"
import { queryKey, RefetchOptions } from "../query"
import { useLCDClient } from "./lcdClient"

export const useTaxRate = (disabled = false) => {
  const lcd = useLCDClient()

  return useQuery(
    [queryKey.treasury.taxRate],
    async () => {
      if (!lcd) return "0"

      const taxRate = await lcd.treasury.taxRate()
      return taxRate.toString() || "0"
    },
    {
      ...RefetchOptions.INFINITY,
      enabled: Boolean(!disabled && lcd),
    }
  )
}

const useGetQueryTaxCap = (disabled = false) => {
  const lcd = useLCDClient()
  const isClassic = lcd?.config?.isClassic

  return (denom?: Denom) => ({
    queryKey: [queryKey.treasury.taxCap, denom],
    queryFn: async () => {
      if (!denom || !isClassic || !isNativeToken(denom) || !lcd) return "0"

      try {
        const taxCap = await lcd.treasury.taxCap(denom)
        return taxCap.amount.toString()
      } catch {
        return String(1e6)
      }
    },
    ...RefetchOptions.INFINITY,
    enabled: Boolean(isDenom(denom) && !disabled && lcd),
  })
}

export const useTaxCap = (denom?: Denom) => {
  const getQueryTaxCap = useGetQueryTaxCap()
  return useQuery(getQueryTaxCap(denom))
}

export const useTaxCaps = (denoms: Denom[], disabled = false) => {
  const getQueryTaxCap = useGetQueryTaxCap(disabled)
  return useQueries(denoms.map(getQueryTaxCap))
}

export const isNativeToken = (token?: Token) =>
  isDenomLuna(token) || isDenomTerra(token)

/* utils */
export const getShouldTax = (token?: Token, isClassic?: boolean) =>
  Boolean(isClassic && isNativeToken(token))
