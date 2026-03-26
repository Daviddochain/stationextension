import { PropsWithChildren, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "react-query"

const InitQueryClient = ({ children }: PropsWithChildren<{}>) => {
  const queryClient = useQueryClient()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const useQueryClient = () => {
  return useMemo(() => {
    return new QueryClient()
  }, [])
}

export default InitQueryClient
