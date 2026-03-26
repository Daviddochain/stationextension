import { WithFetching } from "components/feedback"
import { Read, TokenIcon } from "components/token"
import { useExchangeRates } from "data/queries/coingecko"
import { useCurrency } from "data/settings/Currency"
import { useNetwork } from "data/wallet"
import { useTranslation } from "react-i18next"
import styles from "./AssetChain.module.scss"
import IbcSendBack from "./IbcSendBack"
import { CopyIcon, InternalButton } from "components/general"
import { Tooltip } from "components/display"
import { useDevMode } from "utils/localStorage"
import { truncate } from "@terra-money/terra-utils"
import { useNetworks } from "app/InitNetworks"

export interface Props {
  chain: string
  balance: string
  symbol: string
  decimals: number
  token: string
  denom: string
  path?: string[]
  ibcDenom?: string
}

const AssetChain = (props: Props) => {
  const { chain, symbol, balance, decimals, token, path, ibcDenom, denom } =
    props

  const currency = useCurrency()
  const { data: prices, ...pricesState } = useExchangeRates()
  const { t } = useTranslation()
  const { networks: allNetworks = {} } = useNetworks()
  const networks = useNetwork()
  const { devMode } = useDevMode()

  const chainInfo = allNetworks?.[chain]
  const icon = chainInfo?.icon
  const name = chainInfo?.name ?? chain

  const priceKey =
    token === "uluna"
      ? chain === "columbus-5"
        ? "uluna:classic"
        : chain === "phoenix-1" || chain === "pisco-1"
        ? "uluna:phoenix"
        : token
      : `${chain}:${token}`

  const price = prices?.[priceKey]?.price ?? prices?.[token]?.price ?? 0

  const isSendBackDisabled =
    !!path?.find((pathChain) => !networks?.[pathChain]) ||
    (symbol === "LUNC" && chain === "columbus-5")

  const sendBackTitle = `Send ${symbol} back to ${
    allNetworks?.[path?.[0] ?? ""]?.name ?? path?.[0] ?? ""
  }`

  return (
    <article className={styles.chain}>
      <TokenIcon token={token} icon={icon} size={28} />

      <section className={styles.details}>
        <div className={styles.name}>
          <h4>
            {name}
            {ibcDenom &&
              path &&
              (isSendBackDisabled ? (
                <Tooltip
                  content={
                    <article>
                      <p>
                        {t(
                          "This asset originates from an unsupported chain and cannot be sent back."
                        )}
                      </p>
                    </article>
                  }
                >
                  <span className={styles.send__back__button__disabled}>
                    {t("Send back")}
                  </span>
                </Tooltip>
              ) : (
                <IbcSendBack
                  chainID={chain}
                  token={ibcDenom}
                  title={sendBackTitle}
                >
                  {(open) => (
                    <InternalButton
                      onClick={() => {
                        if (!isSendBackDisabled) open()
                      }}
                      className={styles.send__back__button}
                      disabled={isSendBackDisabled}
                    >
                      {t("Send back")}
                    </InternalButton>
                  )}
                </IbcSendBack>
              ))}
          </h4>

          {path && (
            <p>{path.map((c) => allNetworks?.[c]?.name ?? c).join(" → ")}</p>
          )}

          {devMode && (
            <p>
              <span className={styles.copy__denom}>
                {truncate(denom)}
                <CopyIcon text={denom} size={14} />
              </span>
            </p>
          )}
        </div>

        <h1 className={styles.price}>
          {currency.symbol}{" "}
          {price ? (
            <Read
              {...props}
              amount={price * Number(balance)}
              decimals={decimals}
              fixed={2}
              denom=""
              token=""
            />
          ) : (
            <span>—</span>
          )}
        </h1>

        <h2 className={styles.amount}>
          <WithFetching {...pricesState} height={1}>
            {(progress, wrong) => (
              <>
                {progress}
                {wrong ? (
                  <span className="danger">{t("Failed to query balance")}</span>
                ) : (
                  <Read
                    {...props}
                    amount={balance}
                    token=""
                    fixed={2}
                    decimals={decimals}
                  />
                )}
              </>
            )}
          </WithFetching>{" "}
          {symbol}
        </h2>
      </section>
    </article>
  )
}

export default AssetChain
