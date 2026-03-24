import { useTranslation } from "react-i18next"
import { useQuery } from "react-query"
import { useForm } from "react-hook-form"
import { readAmount } from "@terra-money/terra-utils"
import { SeedKey, AccAddress } from "@terra-money/feather.js"
import { Coins, Delegation, UnbondingDelegation } from "@terra-money/feather.js"
import { sortCoins } from "utils/coin"
import { useInterchainLCDClient } from "data/queries/lcdClient"
import { useCurrency } from "data/settings/Currency"
import { useThemeAnimation } from "data/settings/Theme"
import { Flex, Grid } from "components/layout"
import { Form, Submit } from "components/form"
import { Tag } from "components/display"
import AuthButton from "../../components/AuthButton"
import { useCreateWallet } from "./CreateWalletWizard"
import styles from "./SelectAddress.module.scss"
import { useNativeDenoms } from "data/token"

type AddressOption = {
  id: "terra-118" | "dungeon-118" | "dungeon-330"
  bip: Bip
  prefix: "terra" | "dungeon"
  label: string
}

const ADDRESS_OPTIONS: AddressOption[] = [
  {
    id: "terra-118",
    bip: 118,
    prefix: "terra",
    label: "Terra (118)",
  },
  {
    id: "dungeon-118",
    bip: 118,
    prefix: "dungeon",
    label: "Dungeon / Keplr (118)",
  },
  {
    id: "dungeon-330",
    bip: 330,
    prefix: "dungeon",
    label: "Dungeon Native (330)",
  },
]

const SelectAddress = () => {
  const { t } = useTranslation()
  const currency = useCurrency()
  const lcd = useInterchainLCDClient()
  const readNativeDenom = useNativeDenoms()
  const { values, createWallet } = useCreateWallet()
  const { mnemonic, index } = values
  const seed = SeedKey.seedFromMnemonic(mnemonic)

  const { data: results } = useQuery(
    ["mnemonic", seed, index],
    async () => {
      const results = await Promise.allSettled(
        ADDRESS_OPTIONS.map(async (option) => {
          const mk = new SeedKey({
            seed,
            coinType: option.bip,
            index,
          })

          const address = mk.accAddress(option.prefix)

          const [balance] = await lcd.bank.balance(address)
          const [delegations] = await lcd.staking.delegations(address)
          const [unbondings] = await lcd.staking.unbondingDelegations(address)

          return {
            id: option.id,
            label: option.label,
            address,
            bip: option.bip,
            prefix: option.prefix,
            index,
            balance,
            delegations,
            unbondings,
          }
        })
      )

      return results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            id: "terra-118" | "dungeon-118" | "dungeon-330"
            label: string
            address: AccAddress
            bip: Bip
            prefix: "terra" | "dungeon"
            index: number
            balance: Coins
            delegations: Delegation[]
            unbondings: UnbondingDelegation[]
          }> => result.status === "fulfilled"
        )
        .map((result) => result.value)
    },
    {
      onSuccess: (results) => {
        const dungeon118 = results.find((item) => item.id === "dungeon-118")
        if (!dungeon118) return

        const { balance, delegations, unbondings } = dungeon118
        const isDungeon118Empty =
          !balance.toData().length && !delegations.length && !unbondings.length

        if (isDungeon118Empty) {
          createWallet(330, index)
        }
      },
    }
  )

  const form = useForm<{ selection?: AddressOption["id"] }>()
  const { watch, setValue, handleSubmit } = form
  const { selection } = watch()

  const submit = ({ selection }: { selection?: AddressOption["id"] }) => {
    if (!selection) return

    const selected = ADDRESS_OPTIONS.find((item) => item.id === selection)
    if (!selected) return

    createWallet(selected.bip, index)
  }

  const animation = useThemeAnimation()

  if (!results)
    return (
      <Flex>
        <img src={animation} width={80} height={80} alt={t("Loading...")} />
      </Flex>
    )

  interface Details {
    id: AddressOption["id"]
    label: string
    address: AccAddress
    bip: Bip
    prefix: "terra" | "dungeon"
    balance: Coins
    delegations: Delegation[]
    unbondings: UnbondingDelegation[]
  }

  const renderDetails = ({ label, address, bip, prefix, ...rest }: Details) => {
    const { balance, delegations, unbondings } = rest
    const coins = sortCoins(balance, currency.id)
    const length = coins.length

    return (
      <Grid gap={4}>
        <Grid gap={12}>
          <Flex gap={8} start>
            <Tag color="info" small>
              {label}
            </Tag>

            <Tag color="info" small>
              {prefix}
            </Tag>

            <Tag color="info" small>
              {bip}
            </Tag>

            {!!delegations.length && (
              <Tag color="info" small>
                {t("Delegated")}
              </Tag>
            )}

            {!!unbondings.length && (
              <Tag color="info" small>
                {t("Undelegated")}
              </Tag>
            )}
          </Flex>

          <h1>{address}</h1>
        </Grid>

        <Flex gap={4} start className={styles.coins}>
          {coins
            .slice(0, 3)
            .map((coin) =>
              [
                readAmount(coin.amount),
                readNativeDenom(coin.denom).symbol,
              ].join(" ")
            )
            .join(", ")}

          {length - 3 > 0 && (
            <span className="muted">
              {t("+{{length}} coins", { length: length - 3 })}
            </span>
          )}
        </Flex>
      </Grid>
    )
  }

  return (
    <Grid gap={20}>
      <Form onSubmit={handleSubmit(submit)}>
        {results.map((item) => {
          return (
            <AuthButton
              className={styles.button}
              onClick={() => setValue("selection", item.id)}
              active={item.id === selection}
              key={item.id}
            >
              {renderDetails(item)}
            </AuthButton>
          )
        })}

        <Submit />
      </Form>
    </Grid>
  )
}

export default SelectAddress
