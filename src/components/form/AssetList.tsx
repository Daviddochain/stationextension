import styles from "./ChainSelector.module.scss"
import WithSearchInput from "pages/custom/WithSearchInput"
import classNames from "classnames"

const cx = classNames.bind(styles)

interface AssetType {
  denom: string
  balance: string
  icon: string
  symbol: string
  price: number
  chains: string[]
}

interface Props {
  list: AssetType[]
  onChange: (denom: string) => void
  value: string
  small?: boolean
  noSearch?: boolean
}

const AssetList = ({ list, onChange, value, small, noSearch }: Props) => {
  return (
    <div className={styles.options}>
      <WithSearchInput disabled={noSearch} inline gap={4}>
        {(search) => (
          <div
            className={cx(
              styles.options__container,
              small && styles.options__container__small
            )}
          >
            {list
              .filter(Boolean)
              .filter(
                ({ denom, symbol }) =>
                  (denom ?? "")
                    .toLowerCase()
                    .includes((search ?? "").toLowerCase()) ||
                  (symbol ?? "")
                    .toLowerCase()
                    .includes((search ?? "").toLowerCase())
              )
              .map(({ denom, symbol, icon }) => (
                <button
                  className={denom === value ? styles.active : ""}
                  key={denom}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(denom)
                  }}
                >
                  {icon && <img src={icon} alt={denom} />}
                  {symbol ?? denom}
                </button>
              ))}
          </div>
        )}
      </WithSearchInput>
    </div>
  )
}

export default AssetList
