import { Button } from "components/general"
import { Read } from "components/token"
import { TooltipIcon } from "components/display"
import { useBankBalance, useIsWalletEmpty } from "data/queries/bank"
import { useExchangeRates } from "data/queries/coingecko"
import { useCurrency } from "data/settings/Currency"
import NetWorthTooltip from "./NetWorthTooltip"
import { Path, useWalletRoute } from "./Wallet"
import { useTranslation } from "react-i18next"
import { useNativeDenoms } from "data/token"
import styles from "./NetWorth.module.scss"
import { capitalize } from "@mui/material"
import { FIAT_RAMP, GUARDARIAN_API_KEY } from "config/constants"
// import { Add as AddIcon, Send as SendIcon } from "@mui/icons-material"
import classNames from "classnames"
import { useMemo } from "react"
import qs from "qs"
import { useChainID, useNetwork, useNetworkName } from "data/wallet"
import { useInterchainAddresses } from "auth/hooks/useAddress"
import { ReactComponent as SendIcon } from "styles/images/icons/Send_v2.svg"
import { ReactComponent as ReceiveIcon } from "styles/images/icons/Receive_v2.svg"
import { ReactComponent as AddIcon } from "styles/images/icons/Buy_v2.svg"

const cx = classNames.bind(styles)

const NetWorth = () => {
  const { t } = useTranslation()

  const isWalletEmpty = useIsWalletEmpty()
  const chainID = useChainID()
  const networks = useNetwork()

  const availableGasDenoms = useMemo(() => {
    return Object.keys(networks[chainID]?.gasPrices ?? {})
  }, [chainID, networks])

  const sendButtonDisabled = isWalletEmpty && !!availableGasDenoms.length

  const currency = useCurrency()
  const coins = useBankBalance()
  const { data: prices } = useExchangeRates()
  const readNativeDenom = useNativeDenoms()
  const { setRoute, route } = useWalletRoute()
  const addresses = useInterchainAddresses()
  const networkName = useNetworkName()

  // TODO: show CW20 balances and staked tokens
  const coinsValue = coins?.reduce((acc, { amount, denom }) => {
    const { token, decimals, symbol } = readNativeDenom(denom)
    return (
      acc +
      (parseInt(amount) *
        (symbol?.endsWith("...") ? 0 : prices?.[token]?.price ?? 0)) /
        10 ** decimals
    )
  }, 0)

  const guardarianRampParams = addresses && {
    partner_api_token: GUARDARIAN_API_KEY,
    default_side: "buy_crypto",
    side_toggle_disabled: "true",
    payout_address: addresses["columbus-5"],
    default_fiat_currency: "USD",
    crypto_currencies_list: JSON.stringify([
      {
        ticker: "LUNC",
        network: "LUNC",
      },
    ]),
    theme: "light",
    type: "narrow",
  }

  const guardarianUrlParams = qs.stringify(guardarianRampParams)

  const openGuardarianWindow = () => {
    window.open(
      `${FIAT_RAMP}?${guardarianUrlParams}`,
      "_blank",
      "toolbar=yes,scrollbars=yes,resizable=yes,top=0,left=0,width=420,height=680"
    )
  }

  return (
    <article className={styles.networth}>
      <TooltipIcon content={<NetWorthTooltip />} placement="bottom">
        <p>{capitalize(t("portfolio value"))}</p>
      </TooltipIcon>
      <h1>
        {currency.symbol}{" "}
        <Read
          className={styles.amount}
          amount={coinsValue}
          decimals={0}
          fixed={2}
          denom=""
          token=""
        />
      </h1>
      <div className={styles.networth__buttons}>
        <div className={styles.button__wrapper}>
          <Button
            color="primary"
            className={styles.wallet_primary}
            disabled={sendButtonDisabled}
            onClick={() =>
              setRoute({
                path: Path.send,
                previousPage: route,
              })
            }
          >
            <SendIcon className={cx(styles.icon, styles.send)} />
          </Button>
          <h3>{capitalize(t("send"))}</h3>
        </div>
        <div className={styles.button__wrapper}>
          <Button
            className={styles.wallet_default}
            onClick={() =>
              setRoute({
                path: Path.receive,
                previousPage: route,
              })
            }
          >
            <ReceiveIcon className={cx(styles.icon, styles.receive)} />
          </Button>
          <h3>{capitalize(t("receive"))}</h3>
        </div>
        {networkName === "mainnet" && chainID === "columbus-5" && (
          <div className={styles.button__wrapper}>
            <Button
              className={styles.wallet_default}
              onClick={openGuardarianWindow}
            >
              <AddIcon className={styles.icon} />
            </Button>
            <h2>{t(capitalize("buy"))}</h2>
          </div>
        )}
      </div>
    </article>
  )
}

export default NetWorth
