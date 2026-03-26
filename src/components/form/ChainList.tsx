import styles from "./ChainSelector.module.scss"
import WithSearchInput from "pages/custom/WithSearchInput"
import classNames from "classnames"
import { InterchainNetwork } from "types/network"

const cx = classNames.bind(styles)

interface Props {
  list: InterchainNetwork[]
  onChange: (chain: string) => void
  value: string
  small?: boolean
  noSearch?: boolean
}

const ChainList = ({ list, onChange, value, small, noSearch }: Props) => {
  return (
    <div className={styles.options}>
      <WithSearchInput disabled={noSearch} inline gap={4}>
        {(search) => {
          const safeSearch = (search ?? "").toLowerCase()

          return (
            <div
              className={cx(
                styles.options__container,
                small && styles.options__container__small
              )}
            >
              {list
                .filter(Boolean)
                .filter(({ chainID, name }) => {
                  const safeChainID = (chainID ?? "").toLowerCase()
                  const safeName = (name ?? "").toLowerCase()

                  return (
                    safeChainID.includes(safeSearch) ||
                    safeName.includes(safeSearch)
                  )
                })
                .map(({ chainID, name, icon }) => (
                  <button
                    className={chainID === value ? styles.active : ""}
                    key={chainID}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange(chainID)
                    }}
                  >
                    {icon && <img src={icon} alt={name} />}
                    {name ?? chainID}
                  </button>
                ))}
            </div>
          )
        }}
      </WithSearchInput>
    </div>
  )
}

export default ChainList
