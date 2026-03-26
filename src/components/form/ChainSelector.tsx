import { useMemo, useState, useRef, useEffect } from "react"
import styles from "./ChainSelector.module.scss"
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import { useNetworks } from "app/InitNetworks"
import ChainList from "./ChainList"

interface Props {
  chainsList: string[]
  onChange: (chain: string) => void
  value: string
  small?: boolean
  noSearch?: boolean
}

const ChainSelector = ({ chainsList, onChange, value }: Props) => {
  const { networks } = useNetworks()

  const allNetworks = useMemo(() => networks ?? {}, [networks])

  const list = useMemo(
    () => chainsList.map((chainID) => allNetworks[chainID]).filter(Boolean),
    [allNetworks, chainsList]
  )

  const selected = allNetworks[value]

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

  const handleSelection = (selectedChain: string) => {
    onChange(selectedChain)
    setOpen(false)
  }

  return (
    <div className={styles.container} ref={ref}>
      <button
        type="button"
        className={styles.selector}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          {selected?.icon && <img src={selected.icon} alt={selected.name} />}
          {selected?.name ?? value}
        </span>
        <ArrowDropDownIcon style={{ fontSize: 20 }} className={styles.caret} />
      </button>

      {open && (
        <ChainList list={list} onChange={handleSelection} value={value} />
      )}
    </div>
  )
}

export default ChainSelector
