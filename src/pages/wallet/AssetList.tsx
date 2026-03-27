import { FormError } from "components/form"
import { InternalButton } from "components/general"
import { useBankBalance, useIsWalletEmpty } from "data/queries/bank"
import { useExchangeRates } from "data/queries/coingecko"
import { useNativeDenoms } from "data/token"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import ManageTokens from "./ManageTokens"
import Asset from "./Asset"
import styles from "./AssetList.module.scss"
import { useTokenFilters } from "utils/localStorage"
import { toInput } from "txs/utils"
import {
  useCustomTokensCW20,
  useCustomTokensNative,
} from "data/settings/CustomTokens"
import { useIBCBaseDenoms } from "data/queries/ibc"
import { useNetwork } from "data/wallet"
import { ReactComponent as ManageAssets } from "styles/images/icons/ManageAssets.svg"

const AssetList = () => {
  const { t } = useTranslation()
  const isWalletEmpty = useIsWalletEmpty()
  const { hideNoWhitelist, hideLowBal } = useTokenFilters()
  const networks = useNetwork()

  const coins = useBankBalance()
  const { data: prices } = useExchangeRates()
  const readNativeDenom = useNativeDenoms()
  const native = useCustomTokensNative()
  const cw20 = useCustomTokensCW20()

  console.warn(
    "AssetList coins from useBankBalance =",
    JSON.stringify(coins, null, 2)
  )

  const alwaysVisibleDenoms = useMemo(
    () =>
      new Set([
        ...cw20.list.map((a) => a.token),
        ...native.list.map((a: any) => a.denom ?? a.id),
      ]),
    [cw20.list, native.list]
  )

  const unknownIBCDenomsData = useIBCBaseDenoms(
    (coins ?? [])
      .map(({ denom, chain }) => ({ denom, chainID: chain }))
      .filter(({ denom, chainID }) => {
        const data = readNativeDenom(denom, chainID)
        return denom.startsWith("ibc/") && data.symbol.endsWith("...")
      })
  )

  const unknownIBCDenoms = (unknownIBCDenomsData ?? []).reduce(
    (acc, { data }) =>
      data
        ? {
            ...acc,
            [[data.ibcDenom, data.chainIDs[data.chainIDs.length - 1]].join(
              "*"
            )]: {
              baseDenom: data.baseDenom,
              chainID: data.chainIDs[0],
              chainIDs: data.chainIDs,
            },
          }
        : acc,
    {} as Record<
      string,
      { baseDenom: string; chainID: string; chainIDs: string[] }
    >
  )

  const list = useMemo(
    () =>
      [
        ...Object.values(
          (coins ?? []).reduce((acc, { denom, amount, chain }) => {
            const ibcKey = [denom, chain].join("*")
            const ibcInfo = unknownIBCDenoms[ibcKey]

            const resolvedDenom = ibcInfo?.baseDenom ?? denom
            const resolvedChainID = ibcInfo?.chainIDs?.[0] ?? chain

            const data = readNativeDenom(resolvedDenom, resolvedChainID)

            console.warn(
              "AssetList reduce item =",
              JSON.stringify(
                {
                  originalDenom: denom,
                  resolvedDenom,
                  resolvedChainID,
                  amount,
                  chain,
                  data,
                },
                null,
                2
              )
            )

            const assetChainID =
              resolvedChainID ||
              // @ts-expect-error
              data?.chainID ||
              chain

            const tokenKey = data.token ?? resolvedDenom
            const key = [assetChainID, resolvedDenom].join("*")

            const priceKey =
              tokenKey === "uluna"
                ? assetChainID === "columbus-5"
                  ? "uluna:classic"
                  : assetChainID === "phoenix-1" || assetChainID === "pisco-1"
                  ? "uluna:phoenix"
                  : tokenKey
                : `${assetChainID}:${tokenKey}`

            const price =
              prices?.[priceKey]?.price ?? prices?.[tokenKey]?.price ?? 0
            const change =
              prices?.[priceKey]?.change ?? prices?.[tokenKey]?.change ?? 0

            if (acc[key]) {
              acc[key].balance = `${
                Number(acc[key].balance ?? "0") + Number(amount ?? "0")
              }`
              acc[key].chains = Array.from(
                new Set([...(acc[key].chains ?? []), chain])
              )
              return acc
            }

            return {
              ...acc,
              [key]: {
                denom: resolvedDenom,
                chainID: assetChainID,
                balance: amount ?? "0",
                icon: data.icon,
                symbol: data.symbol,
                price,
                change,
                chains: [chain],
                id: key,
                whitelisted: !(
                  data.isNonWhitelisted ||
                  ibcInfo?.chainIDs?.find((c) => !networks[c])
                ),
              },
            }
          }, {} as Record<string, any>)
        ),
      ]
        .filter((a) => (hideNoWhitelist ? a.whitelisted : true))
        .filter((a) => {
          const { token } = readNativeDenom(a.denom, a.chainID)

          if (!hideLowBal || a.price === 0 || alwaysVisibleDenoms.has(token)) {
            return true
          }

          return a.price * Number(toInput(a.balance ?? "0")) >= 1
        })
        .sort((a, b) => {
          const aValue = a.price * Number(toInput(a.balance ?? "0"))
          const bValue = b.price * Number(toInput(b.balance ?? "0"))
          return bValue - aValue
        }),
    [
      coins,
      readNativeDenom,
      prices,
      hideNoWhitelist,
      hideLowBal,
      alwaysVisibleDenoms,
      unknownIBCDenoms,
      networks,
    ]
  )

  const render = () => {
    if (!coins) return null

    console.warn(
      "AssetList final rendered list =",
      JSON.stringify(list, null, 2)
    )

    return (
      <div>
        {isWalletEmpty && (
          <FormError>{t("Coins required to post transactions")}</FormError>
        )}

        <section>
          {list.map(({ denom, chainID, id, ...item }, i) => (
            <Asset
              denom={denom}
              {...readNativeDenom(
                unknownIBCDenoms[[denom, chainID].join("*")]?.baseDenom ??
                  denom,
                unknownIBCDenoms[[denom, chainID].join("*")]?.chainID ?? chainID
              )}
              id={id}
              {...item}
              key={id ?? i}
            />
          ))}
        </section>
      </div>
    )
  }

  return (
    <article className={styles.assetlist}>
      <div className={styles.assetlist__title}>
        <h3>Assets</h3>
        <ManageTokens>
          {(open) => (
            <InternalButton className={styles.manage__button} onClick={open}>
              {t("Manage")}
              <ManageAssets />
            </InternalButton>
          )}
        </ManageTokens>
      </div>

      <div className={styles.assetlist__list}>{render()}</div>
    </article>
  )
}

export default AssetList
