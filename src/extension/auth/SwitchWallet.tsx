import SelectPreconfigured from "auth/modules/select/SelectPreconfigured"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import MultisigBadge from "auth/components/MultisigBadge"
import BluetoothIcon from "@mui/icons-material/Bluetooth"
import ExtensionList from "../components/ExtensionList"
import { clearStoredPassword } from "../storage"
import { addressFromWords } from "utils/bech32"
import { useNavigate } from "react-router-dom"
import { Flex, Grid } from "components/layout"
import UsbIcon from "@mui/icons-material/Usb"
import { isWallet, useAuth } from "auth"
import { useMemo } from "react"
import { useQueries } from "react-query"
import { useNetworks } from "app/InitNetworks"

const FALLBACK_CLASSIC_LCD = "https://terra-classic-lcd.publicnode.com"

const formatLunc = (amount?: string) => {
  if (!amount) return ""
  const micro = Number(amount)
  if (!Number.isFinite(micro) || micro <= 0) return ""

  const lunc = micro / 1_000_000

  if (lunc >= 1) {
    return `${lunc.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} LUNC`
  }

  return `${lunc.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} LUNC`
}

const parseAmount = (amount?: string) => {
  const value = Number(amount ?? "0")
  return Number.isFinite(value) ? value : 0
}

const getWalletAddress = (wallet: any) => {
  if ("address" in wallet && wallet.address) return wallet.address
  if (wallet?.words?.["330"]) return addressFromWords(wallet.words["330"])
  return ""
}

const SwitchWallet = ({
  manage,
  onSwitch,
}: {
  manage?: () => void
  onSwitch?: () => void
}) => {
  const { wallet, wallets, connect, connectedWallet } = useAuth()
  const navigate = useNavigate()
  const { networks } = useNetworks()

  const classicLCD =
    networks?.classic?.["columbus-5"]?.lcd || FALLBACK_CLASSIC_LCD

  const currentWalletAddress = wallet ? getWalletAddress(wallet) : ""

  const otherWallets = useMemo(
    () => wallets.filter(({ name }) => name !== connectedWallet?.name),
    [wallets, connectedWallet?.name]
  )

  const balanceQueries = useQueries(
    otherWallets.map((walletItem) => {
      const address = getWalletAddress(walletItem)

      return {
        queryKey: ["switch-wallet-lunc-balance", walletItem.name, address],
        queryFn: async () => {
          if (!address) {
            return {
              name: walletItem.name,
              address: "",
              amount: "0",
              hasBalance: false,
            }
          }

          try {
            const res = await fetch(
              `${classicLCD}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uluna`
            )

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`)
            }

            const data = await res.json()
            const amount = data?.balance?.amount ?? "0"

            return {
              name: walletItem.name,
              address,
              amount,
              hasBalance: parseAmount(amount) > 0,
            }
          } catch (error) {
            console.warn(
              `SwitchWallet: failed to fetch LUNC balance for ${walletItem.name}`,
              error
            )

            return {
              name: walletItem.name,
              address,
              amount: "0",
              hasBalance: false,
            }
          }
        },
        staleTime: 30000,
        cacheTime: 300000,
      }
    })
  )

  const balanceMap = useMemo(() => {
    return balanceQueries.reduce((acc, query, index) => {
      const walletItem = otherWallets[index]
      if (!walletItem) return acc

      acc[walletItem.name] = query.data ?? {
        name: walletItem.name,
        address: getWalletAddress(walletItem),
        amount: "0",
        hasBalance: false,
      }

      return acc
    }, {} as Record<string, { name: string; address: string; amount: string; hasBalance: boolean }>)
  }, [balanceQueries, otherWallets])

  const sortedOtherWallets = useMemo(() => {
    return [...otherWallets].sort((a, b) => {
      const aBalance = balanceMap[a.name]
      const bBalance = balanceMap[b.name]

      const aHasBalance = aBalance?.hasBalance ? 1 : 0
      const bHasBalance = bBalance?.hasBalance ? 1 : 0

      if (aHasBalance !== bHasBalance) return bHasBalance - aHasBalance

      const aAmount = parseAmount(aBalance?.amount)
      const bAmount = parseAmount(bBalance?.amount)

      if (aAmount !== bAmount) return bAmount - aAmount

      return a.name.localeCompare(b.name)
    })
  }, [otherWallets, balanceMap])

  const list = [
    wallet && {
      children: (
        <Flex gap={4} start>
          {isWallet.multisig(wallet) && <MultisigBadge />}
          {isWallet.ledger(wallet) &&
            (wallet.bluetooth ? (
              <BluetoothIcon fontSize="small" />
            ) : (
              <UsbIcon fontSize="small" />
            ))}
          {"name" in wallet ? wallet.name : "Ledger"}
        </Flex>
      ),
      description: currentWalletAddress,
      active: true,
      onClick: () => {},
      manage,
    },
    ...sortedOtherWallets.map((walletItem) => {
      const { name, lock } = walletItem

      const select = () => {
        connect(name)
        clearStoredPassword()
        onSwitch && onSwitch()
        navigate("/")
      }

      const address = getWalletAddress(walletItem)
      const luncAmount = balanceMap[name]?.amount ?? "0"
      const formattedLunc = formatLunc(luncAmount)

      const children = (
        <Flex gap={4} start>
          {isWallet.multisig(walletItem) && <MultisigBadge />}
          {isWallet.ledger(walletItem) &&
            (walletItem.bluetooth ? (
              <BluetoothIcon fontSize="small" />
            ) : (
              <UsbIcon fontSize="small" />
            ))}
          {name}
          {lock && <LockOutlinedIcon fontSize="inherit" className="muted" />}
        </Flex>
      )

      const description = formattedLunc
        ? `${address} • ${formattedLunc}`
        : address

      return lock
        ? {
            children,
            to: `/auth/unlock/${name}`,
          }
        : {
            children,
            description,
            onClick: select,
          }
    }),
  ]

  return (
    <Grid gap={8}>
      <SelectPreconfigured />
      <ExtensionList
        list={list.filter((item) => item !== undefined) as any[]}
      />
    </Grid>
  )
}

export default SwitchWallet
