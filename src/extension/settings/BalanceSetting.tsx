import { useMinimumValue } from "data/settings/MinimumValue"
import { RadioGroup } from "components/form"

const BalanceSetting = () => {
  const [value, set, list] = useMinimumValue()

  return (
    <RadioGroup
      options={list}
      value={value}
      onChange={(nextValue) => set(Number(nextValue))}
    />
  )
}

export default BalanceSetting
