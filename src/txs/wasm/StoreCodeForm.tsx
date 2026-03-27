import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { MsgStoreCode } from "@terra-money/feather.js"
import { useAddress, useChainID } from "data/wallet"
import { Form, FormItem, Upload } from "components/form"
import Tx from "../Tx"

interface TxValues {
  code: string
}

const StoreCodeForm = () => {
  const { t } = useTranslation()
  const address = useAddress()
  const chainID = useChainID()

  const [file, setFile] = useState<File>()
  const form = useForm<TxValues>({ mode: "onChange" })
  const { watch, setValue, handleSubmit } = form
  const values = watch()

  useEffect(() => {
    const store = async (file: File) => {
      setValue("code", await readFile(file))
    }

    if (file) store(file)
  }, [file, setValue])

  const createTx = useCallback(
    ({ code }: TxValues) => {
      if (!address || !chainID || !code) return
      const msgs = [new MsgStoreCode(address, code)]
      return { msgs, chainID }
    },
    [address, chainID]
  )

  const estimationTxValues = useMemo(() => values, [values])

  if (!chainID) return null

  const tx = {
    estimationTxValues,
    createTx,
    chain: chainID,
  }

  return (
    <Tx {...tx}>
      {({ fee, submit }) => (
        <Form onSubmit={handleSubmit(submit.fn)}>
          <FormItem label={t("File")}>
            <Upload value={file} onUpload={setFile} />
          </FormItem>

          {fee.render()}
          {submit.button}
        </Form>
      )}
    </Tx>
  )
}

export default StoreCodeForm

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.readAsDataURL(file)

    reader.onload = () => {
      let encoded = reader.result?.toString().replace(/^data:(.*,)?/, "") ?? ""
      if (encoded.length % 4 > 0)
        encoded += "=".repeat(4 - (encoded.length % 4))

      resolve(encoded)
    }

    reader.onerror = (error) => reject(error)
  })
}
