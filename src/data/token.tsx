import { ReactNode } from "react"
import { isDenomIBC, readDenom, truncate } from "@terra-money/terra-utils"
import { AccAddress } from "@terra-money/feather.js"
import { ASSETS } from "config/constants"
import { useTokenInfoCW20 } from "./queries/wasm"
import { useCustomTokensCW20 } from "./settings/CustomTokens"
import {
  useGammTokens,
  GAMM_TOKEN_DECIMALS,
  OSMO_ICON,
} from "./external/osmosis"
import { useCW20Whitelist, useIBCWhitelist } from "./Terra/TerraAssets"
import { useWhitelist } from "./queries/chains"
import { useNetwork } from "./wallet"
import { getChainIDFromAddress } from "utils/bech32"

export const DEFAULT_NATIVE_DECIMALS = 6

export const useTokenItem = (
  token: Token,
  chainID?: string
): TokenItem | undefined => {
  const readNativeDenom = useNativeDenoms()

  const matchToken = (item: TokenItem) => item.token === token

  const { list } = useCustomTokensCW20()
  const customTokenItem = list.find(matchToken)

  const cw20WhitelistResult = useCW20Whitelist(!!customTokenItem)
  const { data: cw20Whitelist = {} } = cw20WhitelistResult
  const listedCW20TokenItem = Object.values(cw20Whitelist ?? {}).find(
    matchToken
  )

  const shouldQueryCW20 = cw20WhitelistResult.isSuccess && !listedCW20TokenItem
  const tokenInfoResult = useTokenInfoCW20(token, shouldQueryCW20)
  const { data: tokenInfo } = tokenInfoResult
  const tokenInfoItem = tokenInfo ? { token, ...tokenInfo } : undefined

  const { data: ibcWhitelist = {} } = useIBCWhitelist()
  const listedIBCTokenItem = ibcWhitelist[token.replace("ibc/", "")]

  if (AccAddress.validate(token)) {
    return customTokenItem ?? listedCW20TokenItem ?? tokenInfoItem
  }

  if (isDenomIBC(token)) {
    const item = {
      ...listedIBCTokenItem,
      denom: token,
      base_denom: listedIBCTokenItem?.base_denom,
    }

    return readIBCDenom(item)
  }

  return readNativeDenom(token, chainID)
}

interface Props {
  token: Token
  chainID?: string
  children: (token: TokenItem) => ReactNode
}

export const WithTokenItem = ({ token, chainID, children }: Props) => {
  const readNativeDenom = useNativeDenoms()
  return <>{children(readNativeDenom(token, chainID))}</>
}

export const getIcon = (path: string) => `${ASSETS}/icon/svg/${path}`

export enum TokenType {
  IBC = "ibc",
  GAMM = "gamm",
  FACTORY = "factory",
  STRIDE = "stride",
}

export const useNativeDenoms = () => {
  const { whitelist, ibcDenoms } = useWhitelist()
  const { list: cw20 } = useCustomTokensCW20()
  const networks = useNetwork()
  const gammTokens = useGammTokens()

  function readNativeDenom(
    denom: Denom,
    chainID?: string
  ): TokenItem & { isNonWhitelisted?: boolean } {
    let tokenType = ""
    let decimals = DEFAULT_NATIVE_DECIMALS

    if (denom.startsWith("ibc/")) tokenType = TokenType.IBC
    else if (denom.startsWith("factory/")) tokenType = TokenType.FACTORY
    else if (denom.startsWith("gamm/")) {
      tokenType = TokenType.GAMM
      decimals = GAMM_TOKEN_DECIMALS
    } else if (
      denom.startsWith("stu") &&
      (!chainID || chainID === "stride-1")
    ) {
      tokenType = TokenType.STRIDE
    }

    let fixedDenom = ""
    switch (tokenType) {
      case TokenType.IBC:
        fixedDenom = `${readDenom(denom).substring(0, 5)}...`
        break

      case TokenType.GAMM:
        fixedDenom = gammTokens.get(denom) ?? readDenom(denom)
        break

      case TokenType.FACTORY: {
        const parts = denom.split(/[/:]/)
        fixedDenom = parts.length >= 2 ? parts.slice(2).join(" ") : denom
        break
      }

      case TokenType.STRIDE:
        fixedDenom = `st${denom.replace("stu", "").toUpperCase()}`
        break

      default:
        fixedDenom = readDenom(denom) || denom
    }

    let factoryIcon: string | undefined

    if (tokenType === TokenType.FACTORY) {
      const tokenAddress = denom.split(/[/:]/)[1]
      const detectedChainID = getChainIDFromAddress(tokenAddress, networks)
      if (detectedChainID) {
        factoryIcon = networks[detectedChainID]?.icon
      }
    }

    if (tokenType === TokenType.GAMM) {
      factoryIcon = OSMO_ICON
    }

    // whitelist match
    if (chainID) {
      const tokenID = `${chainID}:${denom}`
      if (whitelist[tokenID]) return whitelist[tokenID]
    } else {
      const tokenDetails = Object.values(whitelist ?? {}).find(
        ({ token }) => token === denom
      )
      if (tokenDetails) return tokenDetails
    }

    // ibc match SAFE
    const ibcToken = chainID
      ? ibcDenoms?.[`${chainID}:${denom}`]
      : Object.entries(ibcDenoms ?? {}).find(
          ([k]) => k.split(":")[1] === denom
        )?.[1]

    if (
      ibcToken &&
      ibcToken.token &&
      whitelist[ibcToken.token] &&
      (!chainID || ibcToken.chainID === chainID)
    ) {
      return {
        ...whitelist[ibcToken.token],
        type: tokenType,
        // @ts-expect-error
        chains: [ibcToken.chainID],
      }
    }

    // LUNA / LUNC split
    if (denom === "uluna") {
      if (chainID === "columbus-5") {
        return {
          token: denom,
          symbol: "LUNC",
          name: "Luna Classic",
          icon: "https://assets.terraclassic.community/icon/svg/LUNC.svg",
          decimals: 6,
          isNonWhitelisted: false,
        }
      } else {
        return {
          token: denom,
          symbol: "LUNA",
          name: "Luna",
          icon: "https://assets.terraclassic.community/icon/svg/Luna.svg",
          decimals: 6,
          isNonWhitelisted: false,
        }
      }
    }

    const CHAIN_ICON =
      networks?.[chainID ?? ""]?.icon ||
      "https://assets.terraclassic.community/icon/svg/Terra.svg"

    return (
      cw20.find(({ token }) => denom === token) ?? {
        token: denom,
        symbol: fixedDenom,
        name: fixedDenom,
        type: tokenType,
        icon:
          (tokenType === TokenType.IBC
            ? "https://assets.terraclassic.community/icon/svg/IBC.svg"
            : tokenType === TokenType.STRIDE
            ? "https://station-assets.terraclassic.community/img/chains/Stride.png"
            : (tokenType === TokenType.FACTORY ||
                tokenType === TokenType.GAMM) &&
              factoryIcon) || CHAIN_ICON,
        decimals,
        isNonWhitelisted: true,
      }
    )
  }

  return readNativeDenom
}

export const readIBCDenom = (item: IBCTokenItem): TokenItem => {
  const { denom, base_denom } = item
  const symbol =
    item.symbol ?? ((base_denom && readDenom(base_denom)) || base_denom)
  const path = symbol ? `ibc/${symbol}.svg` : "IBC.svg"

  return {
    token: denom,
    symbol: symbol ?? truncate(denom),
    icon: getIcon(path),
    decimals: item.decimals ?? 6,
  }
}
