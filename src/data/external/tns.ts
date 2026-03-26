import { useQuery } from "react-query"
import keccak256 from "keccak256"
import { queryKey, RefetchOptions } from "../query"
import { useInterchainLCDClient } from "../queries/lcdClient"
import { useTerraContracts } from "../Terra/TerraAssets"

export const useTnsAddress = (name: string) => {
  const lcd = useInterchainLCDClient()
  const { data: contracts } = useTerraContracts()

  return useQuery(
    [queryKey.TNS, name],
    async () => {
      if (!contracts || !lcd) return

      const { tnsRegistry: registry } = contracts
      if (!registry) return

      const { resolver } = await lcd.wasm.contractQuery<{ resolver: string }>(
        registry,
        { get_record: { name } }
      )

      if (!resolver) return

      const { address } = await lcd.wasm.contractQuery<{ address: string }>(
        resolver,
        { get_terra_address: { node: node(name) } }
      )

      return address
    },
    {
      ...RefetchOptions.INFINITY,
      enabled: Boolean(name?.endsWith(".ust") && contracts && lcd),
    }
  )
}

export const useTnsName = (address: string) => {
  const lcd = useInterchainLCDClient()
  const { data: contracts } = useTerraContracts()

  return useQuery(
    [queryKey.TNS, address],
    async () => {
      if (!contracts || !address || !lcd) return

      const { tnsReverseRecord: reverseRecord } = contracts
      if (!reverseRecord) return

      const { name } = await lcd.wasm.contractQuery<{ name: string | null }>(
        reverseRecord,
        { get_name: { address } }
      )

      return name
    },
    {
      ...RefetchOptions.INFINITY,
      enabled: Boolean(contracts && address && lcd),
    }
  )
}

function namehash(name: string): Uint8Array {
  if (name) {
    const [label, remainder] = name.split(".")
    const parent = namehash(remainder)
    const labelHash = Uint8Array.from(keccak256(label))

    const combined = new Uint8Array(parent.length + labelHash.length)
    combined.set(parent, 0)
    combined.set(labelHash, parent.length)

    return Uint8Array.from(keccak256(combined))
  }

  return new Uint8Array(32)
}

function node(name: string): number[] {
  return Array.from(namehash(name))
}
