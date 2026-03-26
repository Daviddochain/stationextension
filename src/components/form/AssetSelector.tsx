import { useState, useRef, useEffect } from "react"
import styles from "./ChainSelector.module.scss"
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import AssetList from "./AssetList"

interface AssetType {
  denom: string
  balance: string
  icon: string
  symbol: string
  price: number
  chains: string[]
}

interface Props {
  assetList: AssetType[]
  onChange: (chain: string) => void
  value: string
  assetsByDenom: Record<string, AssetType>
}

const AssetSelector = ({
  assetList,
  onChange,
  value,
  assetsByDenom,
}: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelection = (denom: string) => {
    onChange(denom)
    setOpen(false)
  }

  const selected = assetsByDenom[value]

  return (
    <div className={styles.container} ref={ref}>
      <button
        type="button"
        className={styles.selector}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {selected?.icon && <img src={selected.icon} alt={selected.denom} />}
          {selected?.symbol ?? value}
        </span>
        <ArrowDropDownIcon style={{ fontSize: 20 }} className={styles.caret} />
      </button>

      {open && (
        <AssetList
          list={assetList.filter(({ balance }) => Number(balance) > 0)}
          onChange={handleSelection}
          value={value}
        />
      )}
    </div>
  )
}

export default AssetSelector
