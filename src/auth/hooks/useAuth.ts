import { useCallback, useMemo } from "react"
import { atom, useRecoilState } from "recoil"
import { encode } from "js-base64"
import {
  CreateTxOptions,
  Tx,
  isTxError,
  SeedKey,
  AccAddress,
  SignDoc,
  RawKey,
  SignatureV2,
} from "@terra-money/feather.js"
import { LedgerKey } from "@terra-money/ledger-station-js"
import { useInterchainLCDClient } from "data/queries/lcdClient"
import is from "../scripts/is"
import { addWallet, PasswordError } from "../scripts/keystore"
import { getDecryptedKey, testPassword } from "../scripts/keystore"
import { getWallet, storeWallet } from "../scripts/keystore"
import { clearWallet, lockWallet } from "../scripts/keystore"
import { getStoredWallet, getStoredWallets } from "../scripts/keystore"
import encrypt from "../scripts/encrypt"
import useAvailable from "./useAvailable"
import { addressFromWords, wordsFromAddress } from "utils/bech32"
import { useNetwork } from "./useNetwork"
import { createBleTransport } from "utils/ledger"

export const walletState = atom({
  key: "interchain-wallet",
  default: getWallet(),
})

const useAuth = () => {
  const lcd = useInterchainLCDClient()
  const networks = useNetwork()
  const available = useAvailable()

  const [wallet, setWallet] = useRecoilState(walletState)
  const wallets = getStoredWallets()

  const syncExtensionWallet = useCallback(async (walletData?: any) => {
    try {
      const extensionApi = (globalThis as any)?.chrome
      if (!extensionApi?.storage?.local?.set) return

      await extensionApi.storage.local.set({
        wallet: walletData ?? null,
      })
    } catch (error) {
      console.error("Failed to sync extension wallet", error)
    }
  }, [])

  const connect = useCallback(
    (name: string) => {
      const storedWallet = getStoredWallet(name)

      if ("address" in storedWallet) {
        const { address, lock } = storedWallet
        const words = {
          "330": wordsFromAddress(address),
        }

        if (lock) throw new Error("Wallet is locked")

        const nextWallet = is.multisig(storedWallet)
          ? { name, words, multisig: true as const }
          : { name, words }

        storeWallet(nextWallet)
        setWallet(nextWallet as any)

        void syncExtensionWallet({
          ...nextWallet,
          address: addressFromWords(words["330"], "terra"),
        })
      } else {
        const { lock } = storedWallet
        if (lock) throw new Error("Wallet is locked")

        storeWallet(storedWallet)
        setWallet(storedWallet as any)

        void syncExtensionWallet({
          ...storedWallet,
          address:
            "words" in storedWallet
              ? addressFromWords(storedWallet.words["330"], "terra")
              : (storedWallet as any).address,
        })
      }
    },
    [setWallet, syncExtensionWallet]
  )

  const connectLedger = useCallback(
    (
      words: { "330": string; "118"?: string },
      pubkey: { "330": string; "118"?: string },
      index = 0,
      bluetooth = false,
      name = "Ledger"
    ) => {
      const nextWallet = {
        words,
        pubkey,
        ledger: true as const,
        index,
        bluetooth,
        lock: false as const,
        name,
      }

      addWallet(nextWallet)
      storeWallet(nextWallet)
      setWallet(nextWallet as any)

      void syncExtensionWallet({
        ...nextWallet,
        address: addressFromWords(words["330"], "terra"),
      })
    },
    [setWallet, syncExtensionWallet]
  )

  const connectedWallet = useMemo(() => {
    if (!is.local(wallet)) return
    return wallet
  }, [wallet])

  const getConnectedWallet = useCallback(() => {
    if (!connectedWallet) throw new Error("Wallet is not defined")
    return connectedWallet
  }, [connectedWallet])

  const disconnect = useCallback(() => {
    clearWallet()
    setWallet(undefined)
    void syncExtensionWallet(null)
  }, [setWallet, syncExtensionWallet])

  const lock = useCallback(() => {
    const { name } = getConnectedWallet()
    lockWallet(name)
    disconnect()
  }, [disconnect, getConnectedWallet])

  const getKey = (password: string) => {
    const { name } = getConnectedWallet()
    return getDecryptedKey({ name, password })
  }

  const getLedgerKey = async (coinType: string) => {
    if (!is.ledger(wallet)) throw new Error("Ledger device is not connected")
    const { index, bluetooth } = wallet
    const transport = bluetooth ? createBleTransport : undefined

    return LedgerKey.create({ transport, index, coinType: Number(coinType) })
  }

  const getChain = (chainID?: string) => {
    if (!chainID) throw new Error("Chain is not defined")
    const chain = networks?.[chainID]
    if (!chain) throw new Error(`Network not found for chainID: ${chainID}`)
    return chain
  }

  const encodeEncryptedWallet = (password: string) => {
    const { name, words } = getConnectedWallet()
    const key = getKey(password)
    if (!key) throw new PasswordError("Key do not exist")

    if ("seed" in key) {
      const seed = new SeedKey({
        seed: Buffer.from(key.seed, "hex"),
        coinType: key.legacy ? 118 : 330,
        index: key.index || 0,
      })

      const data = {
        name,
        address: seed.accAddress("terra"),
        encrypted_key: encrypt(seed.privateKey.toString("hex"), password),
      }
      return encode(JSON.stringify(data))
    }

    const data = {
      name,
      address: addressFromWords(words["330"], "terra"),
      encrypted_key: encrypt(key["330"], password),
    }
    return encode(JSON.stringify(data))
  }

  const validatePassword = (password: string) => {
    try {
      const { name } = getConnectedWallet()
      return testPassword({ name, password })
    } catch {
      return "Incorrect password"
    }
  }

  const create = async (txOptions: CreateTxOptions) => {
    if (!wallet) throw new Error("Wallet is not defined")
    if (!lcd) throw new Error("LCD client is not defined")

    const { words } = wallet
    const wordsMap = words as Record<string, string | undefined>
    const chain = getChain(txOptions?.chainID)
    const coinType = String(chain.coinType)

    const address = addressFromWords(wordsMap[coinType] ?? "", chain.prefix)

    return await lcd.tx.create([{ address }], txOptions)
  }

  const createSignature = async (
    tx: Tx,
    chainID: string,
    address: AccAddress,
    password = ""
  ) => {
    if (!wallet) throw new Error("Wallet is not defined")
    if (!lcd) throw new Error("LCD client is not defined")

    const chain = getChain(chainID)
    const coinType = String(chain.coinType)

    const accountInfo = await lcd.auth.accountInfo(address)
    if (!accountInfo) throw new Error("Couldn't retrieve account info")

    const doc = new SignDoc(
      chainID,
      accountInfo.getAccountNumber(),
      accountInfo.getSequenceNumber(),
      tx.auth_info,
      tx.body
    )

    if (is.ledger(wallet)) {
      const key = await getLedgerKey(coinType)
      return await key.createSignatureAmino(doc)
    }

    const pk = getKey(password)
    if (!pk) throw new PasswordError("Incorrect password")

    if ("seed" in pk) {
      const key = new SeedKey({
        seed: Buffer.from(pk.seed, "hex"),
        coinType:
          pk.legacy && parseInt(coinType, 10) === 330
            ? 118
            : parseInt(coinType, 10),
        index: pk.index || 0,
      })
      return await key.createSignatureAmino(doc)
    }

    const rawPk = pk as Record<string, string | undefined>
    if (!rawPk[coinType]) throw new PasswordError("Incorrect password")

    const key = new RawKey(Buffer.from(rawPk[coinType] ?? "", "hex"))
    return await key.createSignatureAmino(doc)
  }

  const getPubkey = async (coinType: "330" | "118", password = "") => {
    if (!wallet) throw new Error("Wallet is not defined")

    if (is.ledger(wallet)) {
      const key = await getLedgerKey(coinType)
      // @ts-expect-error
      return key.publicKey.key
    }

    const pk = getKey(password)
    if (!pk) throw new PasswordError("Incorrect password")

    if ("seed" in pk) {
      const key = new SeedKey({
        seed: Buffer.from(pk.seed, "hex"),
        coinType: pk.legacy ? 118 : parseInt(coinType, 10),
        index: pk.index || 0,
      })
      // @ts-expect-error
      return key.publicKey.key
    }

    const rawPk = pk as Record<string, string | undefined>
    if (!rawPk[coinType]) throw new PasswordError("Incorrect password")
    const key = new RawKey(Buffer.from(rawPk[coinType] ?? "", "hex"))
    // @ts-expect-error
    return key.publicKey.key
  }

  const sign = async (
    txOptions: CreateTxOptions,
    password = "",
    signMode?: SignatureV2.SignMode
  ) => {
    if (!wallet) throw new Error("Wallet is not defined")
    if (!lcd) throw new Error("LCD client is not defined")

    const chain = getChain(txOptions?.chainID)
    const coinType = String(chain.coinType)

    if (is.ledger(wallet)) {
      const key = await getLedgerKey(coinType)
      const lcdWallet = lcd.wallet(key)
      return await lcdWallet.createAndSignTx({
        ...txOptions,
        signMode: SignatureV2.SignMode.SIGN_MODE_LEGACY_AMINO_JSON,
      })
    }

    const pk = getKey(password)
    if (!pk) throw new PasswordError("Incorrect password")

    if ("seed" in pk) {
      const key = new SeedKey({
        seed: Buffer.from(pk.seed, "hex"),
        coinType:
          pk.legacy && parseInt(coinType, 10) === 330
            ? 118
            : parseInt(coinType, 10),
        index: pk.index || 0,
      })
      const lcdWallet = lcd.wallet(key)
      return await lcdWallet.createAndSignTx({ ...txOptions, signMode })
    }

    const rawPk = pk as Record<string, string | undefined>
    if (!rawPk[coinType]) throw new PasswordError("Incorrect password")

    const key = new RawKey(Buffer.from(rawPk[coinType] ?? "", "hex"))
    const lcdWallet = lcd.wallet(key)
    return await lcdWallet.createAndSignTx(txOptions)
  }

  const signBytes = (bytes: Buffer, password = "") => {
    if (!wallet) throw new Error("Wallet is not defined")

    if (is.ledger(wallet)) {
      throw new Error("Ledger can not sign arbitrary data")
    }

    const pk = getKey(password)
    if (!pk) throw new PasswordError("Incorrect password")

    if ("seed" in pk) {
      const key = new SeedKey({
        seed: Buffer.from(pk.seed, "hex"),
        coinType: pk.legacy ? 118 : 330,
        index: pk.index || 0,
      })
      const { signature, recid } = key.ecdsaSign(bytes)
      if (!signature) throw new Error("Signature is undefined")
      return {
        recid,
        signature: Buffer.from(signature).toString("base64"),
        public_key: key.publicKey?.toAmino().value as string,
      }
    }

    const rawPk = pk as Record<string, string | undefined>
    const key = new RawKey(Buffer.from(rawPk["330"] ?? "", "hex"))
    const { signature, recid } = key.ecdsaSign(bytes)
    if (!signature) throw new Error("Signature is undefined")
    return {
      recid,
      signature: Buffer.from(signature).toString("base64"),
      public_key: key.publicKey?.toAmino().value as string,
    }
  }

  const post = async (
    txOptions: CreateTxOptions,
    password = "",
    signMode?: SignatureV2.SignMode
  ) => {
    if (!wallet) throw new Error("Wallet is not defined")
    if (!lcd) throw new Error("LCD client is not defined")

    const signedTx = await sign(txOptions, password, signMode)
    const result = await lcd.tx.broadcastSync(signedTx, txOptions?.chainID)
    if (isTxError(result)) throw new Error(result.raw_log)
    return result
  }

  return {
    wallet,
    wallets,
    getConnectedWallet,
    getLedgerKey,
    connectedWallet,
    connect,
    connectLedger,
    disconnect,
    lock,
    available,
    encodeEncryptedWallet,
    validatePassword,
    createSignature,
    create,
    signBytes,
    sign,
    post,
    getPubkey,
  }
}

export default useAuth
