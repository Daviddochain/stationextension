import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  SettingKey,
  getLocalSetting,
  setLocalSetting,
} from "utils/localStorage"
import { Card, Page } from "components/layout"
import { FormItem, Input } from "components/form"

const Settings = () => {
  const { t } = useTranslation()

  const [input, setInput] = useState<string>(() =>
    String(getLocalSetting(SettingKey.GasAdjustment) ?? "1.5")
  )

  useEffect(() => {
    const value = Number(input)

    if (!isNaN(value) && value > 0) {
      setLocalSetting(SettingKey.GasAdjustment, value)
    }
  }, [input])

  return (
    <Page title={t("Settings")} small>
      <Card>
        <FormItem label="Gas adjustment">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="decimal"
          />
        </FormItem>
      </Card>
    </Page>
  )
}

export default Settings
