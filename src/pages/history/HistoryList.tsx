import { Fragment } from "react"
import { useQuery } from "react-query"
import axios from "axios"
import { queryKey } from "data/query"
import { useNetwork } from "data/wallet"
import { Card, Col, Page } from "components/layout"
import { Empty } from "components/feedback"
import HistoryItem from "./HistoryItem"
import { useInterchainAddresses } from "auth/hooks/useAddress"

interface Props {
  chainID: string
}

const NON_COSMOS_CHAIN_TYPES = new Set([
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "evm",
  "solana",
  "sol"
])

const HISTORY_UNSUPPORTED_LCD_HOSTS = new Set([
  "api.carbon.network",
  "query-api.carbon.network",
  "lcd-axelar.tfl.foundation"
])

const isNonCosmosNetwork = (network?: any) => {
  const chainType = String(network?.chainType ?? "").toLowerCase()

  return (
    NON_COSMOS_CHAIN_TYPES.has(chainType) ||
    network?.chainID === "bitcoin-mainnet" ||
    network?.chainID === "ethereum-mainnet" ||
    network?.chainID === "solana-mainnet" ||
    network?.prefix === "bc" ||
    network?.prefix === "0x" ||
    network?.prefix === "sol"
  )
}

const getLCDHost = (lcd?: string) => {
  if (!lcd) return undefined

  try {
    return new URL(lcd, window.location.origin).hostname
  } catch {
    return undefined
  }
}

const isHistoryBlockedLCD = (lcd?: string) => {
  const host = getLCDHost(lcd)
  return !!host && HISTORY_UNSUPPORTED_LCD_HOSTS.has(host)
}

const canQueryHistory = (network: any, address?: string) => {
  if (!network?.lcd || !address) return false
  if (isNonCosmosNetwork(network)) return false
  if (network.disabledModules?.includes("history")) return false
  if (isHistoryBlockedLCD(network.lcd)) return false

  try {
    new URL(network.lcd, window.location.origin)
  } catch {
    return false
  }

  return true
}

const fetchHistoryEvent = async (
  lcd: string,
  event: string,
  address: string,
  limit: number,
  offset = 0
) => {
  const query = `${event}='${address}'`

  try {
    return await axios.get<AccountHistory>(`/cosmos/tx/v1beta1/txs`, {
      baseURL: lcd,
      params: {
        query,
        "pagination.offset": offset || undefined,
        "pagination.limit": limit,
        order_by: "ORDER_BY_DESC"
      }
    })
  } catch {
    return {
      data: {
        tx_responses: [],
        pagination: {
          next_key: null,
          total: "0"
        }
      } as AccountHistory
    }
  }
}

const HistoryList = ({ chainID }: Props) => {
  const addresses = useInterchainAddresses()
  const address = addresses?.[chainID]
  const networks = useNetwork()

  const LIMIT = 100
  const EVENTS = [
    // any tx signed by the user
    "message.sender",
    // any coin received
    "transfer.recipient",
    // any coin sent
    "transfer.sender"
  ]

  /* query */
  const { data: history, ...state } = useQuery(
    [queryKey.History, networks, address, chainID],
    async ({ pageParam = 0 }) => {
      const result: any[] = []
      const txhases: string[] = []
      const network = networks?.[chainID]

      if (!address || !canQueryHistory(network, address)) return result
      const lcd = network.lcd as string

      const requests = await Promise.all(
        EVENTS.map((event) =>
          fetchHistoryEvent(lcd, event, address, LIMIT, pageParam)
        )
      )

      for (const request of requests) {
        const data = request?.data
        const txResponses = Array.isArray(data?.tx_responses)
          ? data.tx_responses
          : []

        txResponses.forEach((tx) => {
          if (!txhases.includes(tx.txhash)) {
            result.push(tx)
            txhases.push(tx.txhash)
          }
        })
      }

      return result
        .sort((a, b) => Number(b.height) - Number(a.height))
        .slice(0, LIMIT)
    },
    {
      enabled: Boolean(address && networks?.[chainID]?.lcd),
      retry: false,
      refetchOnWindowFocus: false
    }
  )

  const render = () => {
    if (address && !history) return null

    return !history?.length ? (
      <Card>
        <Empty />
      </Card>
    ) : (
      <Col>
        <Fragment>
          {history.map((item) => (
            <HistoryItem {...item} chain={chainID} key={item.txhash} />
          ))}
        </Fragment>
      </Col>
    )
  }

  return (
    <Page {...state} invisible>
      {render()}
    </Page>
  )
}

export default HistoryList
