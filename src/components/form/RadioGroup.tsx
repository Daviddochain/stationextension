import { Key, ReactElement } from "react"
import Radio from "./Radio"
import styles from "./RadioGroup.module.scss"

interface Props<T extends Key> {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (value: T) => void
  reversed?: boolean
}

const RadioGroup = <T extends Key>({
  options,
  value,
  onChange,
  reversed,
}: Props<T>): ReactElement => {
  return (
    <section className={styles.list}>
      {options.map(({ label, disabled, ...option }) => {
        const checked = option.value === value

        return (
          <Radio
            label={label}
            className={styles.item}
            checked={checked}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            key={option.value}
            reversed={reversed}
          />
        )
      })}
    </section>
  )
}

export default RadioGroup as <T extends Key>(props: Props<T>) => ReactElement
