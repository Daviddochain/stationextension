import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { ValAddress } from "@terra-money/feather.js"
import { MsgWithdrawValidatorCommission } from "@terra-money/feather.js"
import { sortCoins } from "utils/coin"
import { useCurrency } from "data/settings/Currency"
import { useAddress, useChainID } from "data/wallet"
import { useMemoizedCalcValue } from "data/queries/coingecko"
import { useValidatorCommission } from "data/queries/distribution"
import { useWithdrawAddress } from "data/queries/distribution"
import { WithTokenItem } from "data/token"
import { Form, FormArrow, Input } from "components/form"
import { TokenCard, TokenCardGrid } from "components/token"
import Tx from "../Tx"

const WithdrawCommissionForm = () => {
  const currency = useCurrency()
  const address = useAddress()
  const chainID = useChainID()
  const calcValue = useMemoizedCalcValue()

  const { handleSubmit } = useForm({ mode: "onChange" })

  const { data: validatorCommission } = useValidatorCommission()
  const { data: withdrawAddress } = useWithdrawAddress()

  const createTx = useCallback(() => {
    if (!address || !chainID) return
    const validatorAddress = ValAddress.fromAccAddress(address, "terra")
    const msgs = [new MsgWithdrawValidatorCommission(validatorAddress)]
    return { msgs, chainID }
  }, [address, chainID])

  const estimationTxValues = useMemo(() => ({}), [])

  const renderCommission = () => {
    if (!validatorCommission) return null

    const sorter = (a: CoinData, b: CoinData) =>
      Number(calcValue(b)) - Number(calcValue(a))

    const list = sortCoins(validatorCommission, currency.id, sorter)

    return (
      <TokenCardGrid maxHeight>
        {list.map((item) => {
          const { amount, denom } = item
          return (
            <WithTokenItem token={denom} key={denom}>
              {(data) => (
                <TokenCard {...data} amount={amount} value={calcValue(item)} />
              )}
            </WithTokenItem>
          )
        })}
      </TokenCardGrid>
    )
  }

  const renderAddress = () => {
    if (!withdrawAddress) return null
    return (
      <>
        <FormArrow />
        <Input defaultValue={withdrawAddress} readOnly />
      </>
    )
  }

  if (!chainID) return null

  const tx = {
    estimationTxValues,
    createTx,
    chain: chainID,
  }

  return (
    <Tx {...tx}>
      {({ fee, submit }) => (
        <Form onSubmit={handleSubmit(submit.fn)}>
          {renderCommission()}
          {renderAddress()}
          {fee.render()}
          {submit.button}
        </Form>
      )}
    </Tx>
  )
}

export default WithdrawCommissionForm
