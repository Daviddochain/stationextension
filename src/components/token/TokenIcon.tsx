import { HTMLAttributes, useState } from "react"
import classNames from "classnames/bind"
import { AccAddress } from "@terra-money/feather.js"
import { isDenomIBC } from "@terra-money/terra-utils"
import { getIcon } from "data/token"
import { STATION_ASSETS } from "config/constants"
import styles from "./TokenIcon.module.scss"

const cx = classNames.bind(styles)

interface Props extends HTMLAttributes<HTMLImageElement> {
  token: Token
  icon?: string
  size?: number | "inherit"
}

const normalizeAssetUrl = (url?: string) => {
  if (!url) return url

  if (url.startsWith("undefined/")) {
    return `${STATION_ASSETS}/${url.replace(/^undefined\//, "")}`
  }

  if (url.startsWith("undefined")) {
    return `${STATION_ASSETS}/${url.replace(/^undefined/, "")}`
  }

  if (url.startsWith("http://localhost:3001/")) {
    return url.replace("http://localhost:3001", STATION_ASSETS)
  }

  if (url.startsWith("/img/")) {
    return `${STATION_ASSETS}${url}`
  }

  return url
}

const TokenIcon = ({ token, icon, size, className, ...rest }: Props) => {
  const [isError, setIsError] = useState(false)

  const safeToken = token ?? ""

  const defaultIcon = AccAddress.validate(safeToken)
    ? getIcon("CW.svg")
    : isDenomIBC(safeToken)
    ? getIcon("IBC.svg")
    : getIcon("Terra.svg")

  const normalizedIcon = normalizeAssetUrl(icon)
  const src = !normalizedIcon || isError ? defaultIcon : normalizedIcon

  const sizes =
    size === "inherit"
      ? undefined
      : {
          width: size ?? 24,
          height: size ?? 24,
        }

  return (
    <img
      {...rest}
      {...sizes}
      src={src}
      className={cx(styles.icon, className)}
      onError={() => setIsError(true)}
      alt=""
    />
  )
}

export default TokenIcon
