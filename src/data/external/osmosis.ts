import { useQuery } from "react-query"
import request from "axios"
import { queryKey } from "../query"

// https://api-osmosis.imperator.co/swagger/
export const OSMOSIS_API_URL = "https://api-osmosis.imperator.co"

export const GAMM_TOKEN_DECIMALS = 18
export const OSMO_ICON =
  "https://station-assets.terraclassic.community/img/chains/Osmosis.svg"

interface IOsmosisPoolAsset {
  symbol: string
  amount: number
  denom: string
  coingecko_id: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  volume_7d: number
  price: number
  fees: string
}

interface IOsmosisPoolResponse {
  [key: string]: IOsmosisPoolAsset[]
}

export const useGammTokens = () => {
  const fetch = useQuery(
    [queryKey.gammTokens],
    async () => {
      try {
        const { data } = await request.get<IOsmosisPoolResponse>(
          "/pools/v2/all?low_liquidity=true",
          { baseURL: OSMOSIS_API_URL, timeout: 8000 }
        )

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return {}
        }

        return data
      } catch (error) {
        console.warn("useGammTokens: failed to load Osmosis pool data")
        return {}
      }
    },
    {
      cacheTime: Infinity,
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const gammTokens = new Map<string, string>()

  if (fetch.data) {
    for (const [poolId, poolAsset] of Object.entries(fetch.data)) {
      gammTokens.set(
        "gamm/pool/" + poolId,
        poolAsset.map((asset) => asset.symbol).join("-") + " LP"
      )
    }
  }

  return gammTokens
}
