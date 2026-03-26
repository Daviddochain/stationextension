import { useSelectedDisplayChain } from "utils/localStorage"
import { useNetworks } from "app/InitNetworks"
import styles from "./NetworkHeader.module.scss"

const NetworkHeader = () => {
  const { selectedDisplayChain } = useSelectedDisplayChain()
  const { networks } = useNetworks()

  if (!selectedDisplayChain || !networks?.[selectedDisplayChain]) return null

  const chain = networks[selectedDisplayChain]

  return <div className={styles.component}>{chain.name}</div>
}

export default NetworkHeader
