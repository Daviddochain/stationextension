import { PropsWithChildren } from "react"
import {
  CoinBalance,
  useInitialBankBalance,
  useInitialTokenBalance,
} from "data/queries/bank"
import { BankBalanceProvider } from "data/queries/bank"
import { combineState } from "data/query"
import { WithFetching } from "components/feedback"

const InitBankBalance = ({ children }: PropsWithChildren<{}>) => {
  const balances = useInitialBankBalance() ?? []
  const tokenBalancesQuery = useInitialTokenBalance() ?? []

  // 🔴 CRITICAL FIX: avoid crashing when empty
  if (!balances.length && !tokenBalancesQuery.length) {
    return <BankBalanceProvider value={[]}>{children}</BankBalanceProvider>
  }

  const state = combineState(...balances, ...tokenBalancesQuery)

  const bankBalance = balances.reduce(
    (acc, { data }) => (data ? [...acc, ...data] : acc),
    [] as CoinBalance[]
  )

  const tokenBalance: CoinBalance[] = tokenBalancesQuery.reduce(
    (acc, { data }) => (data ? [...acc, data] : acc),
    [] as CoinBalance[]
  )

  const mergedMap: Record<string, CoinBalance> = {}

  ;[...bankBalance, ...tokenBalance].forEach((b) => {
    const key = `${b.chain}:${b.denom}`

    if (!mergedMap[key]) {
      mergedMap[key] = b
    } else if (Number(b.amount) > Number(mergedMap[key].amount)) {
      mergedMap[key] = b
    }
  })

  const finalBalances = Object.values(mergedMap)

  return (
    <BankBalanceProvider value={finalBalances}>
      <WithFetching {...state}>
        {(progress) => (
          <>
            {progress}
            {children}
          </>
        )}
      </WithFetching>
    </BankBalanceProvider>
  )
}

export default InitBankBalance
